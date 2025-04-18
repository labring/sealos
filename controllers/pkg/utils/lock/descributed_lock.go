package dlock

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"gorm.io/gorm"
)

var (
	ErrLockNotAcquired = errors.New("lock not acquired")
	ErrLockNotHeld     = errors.New("lock not held by this instance")
)

type DistributedLock struct {
	db        *gorm.DB
	lockName  string
	holderID  string
	stopRenew chan struct{}
	once      sync.Once
}

func NewDistributedLock(db *gorm.DB, lockName string, holderID string) *DistributedLock {
	return &DistributedLock{
		db:        db,
		lockName:  lockName,
		holderID:  holderID,
		stopRenew: make(chan struct{}),
		once:      sync.Once{},
	}
}

// TryLock acquisition method
func (dl *DistributedLock) TryLock(ctx context.Context, ttl time.Duration) error {
	expiresAt := time.Now().UTC().Add(ttl)

	err := dl.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := tx.Exec(`
		CREATE TABLE IF NOT EXISTS distributed_locks (
			lock_name STRING PRIMARY KEY,
			holder_id STRING NOT NULL,
			expires_at TIMESTAMPTZ NOT NULL,
			version INT NOT NULL DEFAULT 1
		)
	`).Error
		if err != nil {
			return fmt.Errorf("failed to create table: %w", err)
		}

		// try to get the current lock state first
		var currentLock struct {
			HolderID  string
			ExpiresAt time.Time
		}

		err = tx.Raw(`
            SELECT holder_id, expires_at 
            FROM distributed_locks 
            WHERE lock_name = ? FOR UPDATE
        `, dl.lockName).Scan(&currentLock).Error

		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		// determines whether the lock can be obtained
		if currentLock.HolderID != "" &&
			currentLock.ExpiresAt.After(time.Now().UTC()) &&
			currentLock.HolderID != dl.holderID {
			return ErrLockNotAcquired
		}

		// use upsert atomic operations
		result := tx.Exec(`
            INSERT INTO distributed_locks (lock_name, holder_id, expires_at, version)
            VALUES (?, ?, ?, 1)
            ON CONFLICT (lock_name) DO UPDATE
            SET 
                holder_id = excluded.holder_id,
                expires_at = excluded.expires_at,
                version = distributed_locks.version + 1
            WHERE distributed_locks.expires_at <= now() OR distributed_locks.holder_id = excluded.holder_id
        `, dl.lockName, dl.holderID, expiresAt)

		if result.Error != nil {
			return result.Error
		}

		if result.RowsAffected == 0 {
			return ErrLockNotAcquired
		}

		return nil
	})

	if err != nil {
		return err
	}

	go dl.renewLock(ttl)
	return nil
}

func (dl *DistributedLock) renewLock(ttl time.Duration) {
	ticker := time.NewTicker(ttl / 2)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			expiresAt := time.Now().UTC().Add(ttl)

			err := dl.db.Transaction(func(tx *gorm.DB) error {
				result := tx.Exec(`
					UPDATE distributed_locks
					SET expires_at = ?, version = version + 1
					WHERE lock_name = ? AND holder_id = ?
				`, expiresAt, dl.lockName, dl.holderID)

				if result.Error != nil {
					return result.Error
				}

				if result.RowsAffected == 0 {
					return ErrLockNotHeld
				}

				return nil
			})

			if err != nil {
				// Failed to renew the lock. The lock may have been acquired by another instance
				close(dl.stopRenew)
				return
			}

		case <-dl.stopRenew:
			return
		}
	}
}

func (dl *DistributedLock) Unlock() error {
	dl.once.Do(func() {
		close(dl.stopRenew)
	})

	return dl.db.Transaction(func(tx *gorm.DB) error {
		result := tx.Exec(`
			DELETE FROM distributed_locks
			WHERE lock_name = ? AND holder_id = ?
		`, dl.lockName, dl.holderID)

		if result.Error != nil {
			return result.Error
		}
		//
		//if result.RowsAffected == 0 {
		//	return ErrLockNotHeld
		//}

		return nil
	})
}

func (dl *DistributedLock) IsHeld(ctx context.Context) (bool, error) {
	var count int64
	err := dl.db.WithContext(ctx).Model(&struct {
		LockName string `gorm:"column:lock_name"`
	}{}).
		Table("distributed_locks").
		Where("lock_name = ? AND holder_id = ? AND expires_at > now()", dl.lockName, dl.holderID).
		Count(&count).Error

	if err != nil {
		return false, err
	}

	return count > 0, nil
}
