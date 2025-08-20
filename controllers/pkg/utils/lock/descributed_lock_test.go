package dlock_test

import (
	"context"
	"errors"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"

	dlock "github.com/labring/sealos/controllers/pkg/utils/lock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// setupTestDB 创建测试数据库连接
func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	// TODO need to set up a real test database
	dsn := os.Getenv("TEST_DB_URI")
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	require.NoError(t, err)

	// 确保表存在
	err = db.Exec(`
		CREATE TABLE IF NOT EXISTS distributed_locks (
			lock_name STRING PRIMARY KEY,
			holder_id STRING NOT NULL,
			expires_at TIMESTAMPTZ NOT NULL,
			version INT NOT NULL DEFAULT 1
		)
	`).Error
	require.NoError(t, err)

	// 清空测试数据
	err = db.Exec("DELETE FROM distributed_locks").Error
	require.NoError(t, err)

	return db
}

func checkAssert(t *testing.T, ok bool) {
	t.Helper()

	if !ok {
		t.Fatalf(
			"[%s] Test failed: %v",
			time.Now().UTC().Format(time.RFC3339),
			errors.New("test failed"),
		)
	}
}

const (
	instanceID = "instance-1"
)

func TestLockAcquireAndRelease(t *testing.T) {
	db := setupTestDB(t)
	lockName := "test-lock"
	holderID := instanceID

	lock := dlock.NewDistributedLock(db, lockName, holderID)

	// 测试获取锁
	err := lock.TryLock(context.Background(), 10*time.Second)
	checkAssert(t, assert.NoError(t, err))

	// 验证锁确实被持有
	held, err := lock.IsHeld(context.Background())
	checkAssert(t, assert.NoError(t, err))
	checkAssert(t, assert.True(t, held))

	// 测试释放锁
	err = lock.Unlock()
	checkAssert(t, assert.NoError(t, err))

	// 验证锁已释放
	held, err = lock.IsHeld(context.Background())
	checkAssert(t, assert.NoError(t, err))
	checkAssert(t, assert.False(t, held))
}

func TestLockMutualExclusion(t *testing.T) {
	db := setupTestDB(t)
	lockName := "mutex-lock"

	// 第一个实例获取锁
	lock1 := dlock.NewDistributedLock(db, lockName, instanceID)
	err := lock1.TryLock(context.Background(), 10*time.Second)
	checkAssert(t, assert.NoError(t, err))

	// 第二个实例尝试获取相同的锁
	lock2 := dlock.NewDistributedLock(db, lockName, "instance-2")
	err = lock2.TryLock(context.Background(), 10*time.Second)
	checkAssert(t, assert.Error(t, err))
	checkAssert(t, assert.True(t, errors.Is(err, dlock.ErrLockNotAcquired)))

	// 第一个实例释放锁
	err = lock1.Unlock()
	checkAssert(t, assert.NoError(t, err))

	// 现在第二个实例应该能获取锁
	err = lock2.TryLock(context.Background(), 10*time.Second)
	checkAssert(t, assert.NoError(t, err))

	// 清理
	err = lock2.Unlock()
	checkAssert(t, assert.NoError(t, err))
}

func TestConcurrentLockAcquisition(t *testing.T) {
	db := setupTestDB(t)
	lockName := "concurrent-lock"
	numClients := 10
	var wg sync.WaitGroup
	successCh := make(chan bool, numClients)

	barrier := make(chan struct{}) // 添加并发屏障

	for i := range numClients {
		wg.Add(1)
		go func(instanceID int) {
			defer wg.Done()
			holderID := fmt.Sprintf("instance-%d", instanceID)
			lock := dlock.NewDistributedLock(db, lockName, holderID)

			<-barrier // 等待所有goroutine就绪

			err := lock.TryLock(context.Background(), 5*time.Second)
			if err == nil {
				successCh <- true
				fmt.Printf("Instance %d acquired the lock\n", instanceID)
				time.Sleep(100 * time.Millisecond) // 模拟工作
				err = lock.Unlock()
				checkAssert(t, assert.NoError(t, err))
			} else {
				fmt.Printf("Instance %d failed to acquire the lock: %v\n", instanceID, err)
				checkAssert(t, assert.True(t, errors.Is(err, dlock.ErrLockNotAcquired)))
			}
		}(i)
	}

	close(barrier) // 同时释放所有goroutine
	wg.Wait()
	close(successCh)

	// 验证只有一个成功获取锁
	successCount := 0
	for range successCh {
		successCount++
	}
	checkAssert(t, assert.Equal(t, 1, successCount))
}

func TestLockRenewal(t *testing.T) {
	db := setupTestDB(t)
	lockName := "renewal-lock"
	holderID := instanceID

	lock := dlock.NewDistributedLock(db, lockName, holderID)

	// 获取锁，TTL很短
	err := lock.TryLock(context.Background(), 1*time.Second)
	checkAssert(t, assert.NoError(t, err))

	// 等待超过初始TTL，但续约应该保持锁
	time.Sleep(2 * time.Second)

	// 验证锁仍然被持有
	held, err := lock.IsHeld(context.Background())
	checkAssert(t, assert.NoError(t, err))
	checkAssert(t, assert.True(t, held))

	// 停止续约
	err = lock.Unlock()
	checkAssert(t, assert.NoError(t, err))

	// 验证锁已释放
	held, err = lock.IsHeld(context.Background())
	checkAssert(t, assert.NoError(t, err))
	checkAssert(t, assert.False(t, held))
}

func TestLockExpiration(t *testing.T) {
	db := setupTestDB(t)
	lockName := "expiring-lock"

	// 第一个实例获取锁，TTL很短
	lock1 := dlock.NewDistributedLock(db, lockName, instanceID)
	err := lock1.TryLock(context.Background(), 10*time.Second)
	checkAssert(t, assert.NoError(t, err))

	fmt.Printf("%s Instance 1 acquired the lock\n", time.Now().UTC())
	// 等待锁过期
	time.Sleep(11 * time.Second)

	fmt.Printf("%s Instance 1 lock expired\n", time.Now().UTC())

	// 第二个实例仍然不能获取锁，因为第一个实例持有锁后台不断续约
	lock2 := dlock.NewDistributedLock(db, lockName, "instance-2")
	err = lock2.TryLock(context.Background(), 10*time.Second)
	checkAssert(t, assert.Error(t, err))

	// 清理
	err = lock2.Unlock()
	checkAssert(t, assert.NoError(t, err))
}

func TestDoubleUnlock(t *testing.T) {
	db := setupTestDB(t)
	lockName := "double-unlock-lock"
	holderID := instanceID

	lock := dlock.NewDistributedLock(db, lockName, holderID)

	// 获取锁
	err := lock.TryLock(context.Background(), 10*time.Second)
	checkAssert(t, assert.NoError(t, err))

	// 第一次释放
	err = lock.Unlock()
	checkAssert(t, assert.NoError(t, err))

	// 第二次释放也成功
	err = lock.Unlock()
	checkAssert(t, assert.NoError(t, err))
}

func TestContextCancellation(t *testing.T) {
	db := setupTestDB(t)
	lockName := "ctx-cancel-lock"
	holderID := instanceID

	// 先让另一个实例持有锁
	otherLock := dlock.NewDistributedLock(db, lockName, "instance-2")
	err := otherLock.TryLock(context.Background(), 10*time.Second)
	checkAssert(t, assert.NoError(t, err))

	// 创建可取消的上下文
	ctx, cancel := context.WithCancel(context.Background())

	// 在新的goroutine中尝试获取锁
	var wg sync.WaitGroup
	wg.Add(1)
	var acquireErr error

	go func() {
		defer wg.Done()
		lock := dlock.NewDistributedLock(db, lockName, holderID)
		acquireErr = lock.TryLock(ctx, 10*time.Second)
	}()

	// 等待一会儿然后取消上下文
	time.Sleep(1 * time.Millisecond)
	cancel()

	wg.Wait()

	// 验证获取被取消
	checkAssert(t, assert.Error(t, acquireErr))
	checkAssert(t, assert.True(t, errors.Is(acquireErr, context.Canceled)))

	// 清理
	err = otherLock.Unlock()
	checkAssert(t, assert.NoError(t, err))
}

func TestLongRunningTaskWithLock(t *testing.T) {
	db := setupTestDB(t)
	lockName := "long-task-lock"
	holderID := instanceID

	lock := dlock.NewDistributedLock(db, lockName, holderID)

	// 获取锁，TTL较短以测试续约
	err := lock.TryLock(context.Background(), 2*time.Second)
	checkAssert(t, assert.NoError(t, err))

	// 模拟长时间运行任务
	done := make(chan struct{})
	go func() {
		for range 10 {
			held, err := lock.IsHeld(context.Background())
			checkAssert(t, assert.NoError(t, err))
			if !held {
				t.Log("锁丢失，任务中止")
				return
			}
			time.Sleep(1 * time.Second)
		}
		close(done)
	}()

	// 等待任务完成或超时
	select {
	case <-done:
		t.Log("任务成功完成")
	case <-time.After(11 * time.Second):
		t.Fatal("任务超时")
	}

	// 清理
	err = lock.Unlock()
	checkAssert(t, assert.NoError(t, err))
}

func TestAll(t *testing.T) {
	// setupTestDB(t)

	TestLockAcquireAndRelease(t)

	TestLockMutualExclusion(t)

	TestConcurrentLockAcquisition(t)

	TestLockRenewal(t)

	TestLockExpiration(t)

	TestDoubleUnlock(t)

	TestContextCancellation(t)

	TestLongRunningTaskWithLock(t)
}
