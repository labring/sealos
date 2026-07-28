package controllers

import (
	"context"
	"database/sql"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/go-logr/logr"
	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/controllers/pkg/utils/maps"
	"github.com/testcontainers/testcontainers-go"
	postgrescontainer "github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type debtSnapshotAccountV2 struct {
	database.AccountV2
	db *gorm.DB
}

func (a *debtSnapshotAccountV2) GetGlobalDB() *gorm.DB {
	return a.db
}

func TestLoadDebtUsersAtReadsOneConsistentSnapshot(t *testing.T) {
	testcontainers.SkipIfProviderIsNotHealthy(t)
	ctx := context.Background()
	container, err := postgrescontainer.Run(ctx, "postgres:16-alpine",
		postgrescontainer.WithDatabase("account"),
		postgrescontainer.WithUsername("account"),
		postgrescontainer.WithPassword("account"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").WithOccurrence(2),
		),
	)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := container.Terminate(ctx); err != nil {
			t.Errorf("terminate PostgreSQL: %v", err)
		}
	})
	dsn, err := container.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatal(err)
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&types.Debt{}, &types.DebtStatusRecord{}); err != nil {
		t.Fatal(err)
	}

	userUID := uuid.New()
	endHourTime := time.Now().UTC().Add(-time.Hour).Truncate(time.Hour)
	if err := db.Create(&types.Debt{
		UserUID:           userUID,
		CreatedAt:         endHourTime.Add(-time.Hour),
		UpdatedAt:         endHourTime.Add(-time.Hour),
		AccountDebtStatus: types.NormalPeriod,
	}).Error; err != nil {
		t.Fatal(err)
	}

	debtRead := make(chan struct{})
	continueRead := make(chan struct{})
	var pauseOnce atomic.Bool
	var transactionMu sync.Mutex
	var debtTransaction, recordTransaction *sql.Tx
	if err := db.Callback().Query().After("gorm:query").Register(
		"test:capture_debt_snapshot",
		func(tx *gorm.DB) {
			transaction, ok := tx.Statement.ConnPool.(*sql.Tx)
			if !ok || tx.Statement.Schema == nil {
				return
			}
			transactionMu.Lock()
			switch tx.Statement.Schema.Table {
			case (types.Debt{}).TableName():
				debtTransaction = transaction
			case (types.DebtStatusRecord{}).TableName():
				recordTransaction = transaction
			}
			transactionMu.Unlock()
			if tx.Statement.Schema.Table == (types.Debt{}).TableName() &&
				pauseOnce.CompareAndSwap(false, true) {
				close(debtRead)
				<-continueRead
			}
		},
	); err != nil {
		t.Fatal(err)
	}

	DebtUserMap = maps.NewConcurrentNullValueMap()
	reconciler := &BillingReconciler{
		AccountV2: &debtSnapshotAccountV2{db: db},
		Logger:    logr.Discard(),
	}
	result := make(chan error, 1)
	go func() {
		result <- reconciler.loadDebtUsersAt(endHourTime)
	}()
	select {
	case <-debtRead:
	case <-time.After(5 * time.Second):
		close(continueRead)
		t.Fatal("timed out waiting for the debt snapshot read")
	}

	transitionTime := time.Now().UTC()
	if err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&types.Debt{}).
			Where("user_uid = ?", userUID).
			Updates(map[string]any{
				"account_debt_status": types.DebtPeriod,
				"updated_at":          transitionTime,
			}).Error; err != nil {
			return err
		}
		return tx.Create(&types.DebtStatusRecord{
			ID:            uuid.New(),
			UserUID:       userUID,
			LastStatus:    types.NormalPeriod,
			CurrentStatus: types.DebtPeriod,
			CreateAt:      transitionTime,
		}).Error
	}); err != nil {
		close(continueRead)
		t.Fatal(err)
	}
	close(continueRead)
	select {
	case err := <-result:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("timed out waiting for the consistent debt snapshot")
	}

	transactionMu.Lock()
	sameTransaction := debtTransaction != nil && debtTransaction == recordTransaction
	transactionMu.Unlock()
	if !sameTransaction {
		t.Fatal("debt and status history were read from different transactions")
	}
	if _, inDebt := DebtUserMap.Get(userUID.String()); inDebt {
		t.Fatal("the historical hour used the concurrently committed debt status")
	}
}
