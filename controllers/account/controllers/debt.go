package controllers

import (
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
	"gorm.io/gorm"
)

func (r *DebtReconciler) Start() {
	db := r.AccountV2.GetGlobalDB()
	var wg sync.WaitGroup

	// 1.1 正常债务状态处理
	wg.Add(1)
	go func() {
		defer wg.Done()
		processWithTimeRange(db, &types.AccountTransaction{}, "created_at", 1*time.Hour, 24*time.Hour, func(db *gorm.DB, start, end time.Time) {
			users := getUniqueUsers(db, &types.AccountTransaction{}, "created_at", start, end)
			processUsersInParallel(db, users)
			log.Printf("Processed hourly debt status for %d users from %v to %v", len(users), start, end)
		})
	}()

	// 1.2 欠费转为清理状态处理
	wg.Add(1)
	go func() {
		defer wg.Done()
		ticker := time.NewTicker(24 * time.Hour)
		for range ticker.C {
			var debts []types.Debt
			db.Where("account_debt_status = ? AND last_update_time < ?", DebtPeriod, time.Now().Add(-7*24*time.Hour)).
				Find(&debts)
			for _, debt := range debts {
				updateDebtStatus(db, debt.UserID, types.DebtDeletionPeriod)
			}
			log.Println("Debt to DebtDeletionPeriod processed for", len(debts), "users")
		}
	}()

	// 1.3 清理转为删除状态处理
	wg.Add(1)
	go func() {
		defer wg.Done()
		ticker := time.NewTicker(24 * time.Hour)
		for range ticker.C {
			var debts []types.Debt
			db.Where("account_debt_status = ? AND last_update_time < ?", types.DebtDeletionPeriod, time.Now().Add(-7*24*time.Hour)).
				Find(&debts)
			for _, debt := range debts {
				updateDebtStatus(db, debt.UserID, types.FinalDeletionPeriod)
			}
			log.Println("DebtDeletionPeriod to FinalDeletion processed for", len(debts), "users")
		}
	}()

	// 2.1 充值记录处理
	wg.Add(1)
	go func() {
		defer wg.Done()
		processWithTimeRange(db, &types.Payment{}, "created_at", 1*time.Second, 24*time.Hour, func(db *gorm.DB, start, end time.Time) {
			users := getUniqueUsers(db, &types.Payment{}, "created_at", start, end)
			processUsersInParallel(db, users)
			log.Printf("Processed payment status for %d users from %v to %v", len(users), start, end)
		})
	}()

	// 2.2 订阅变更处理
	wg.Add(1)
	go func() {
		defer wg.Done()
		processWithTimeRange(db, &types.Subscription{}, "update_at", 1*time.Second, 24*time.Hour, func(db *gorm.DB, start, end time.Time) {
			users := getUniqueUsers(db, &types.Subscription{}, "update_at", start, end)
			processUsersInParallel(db, users)
			log.Printf("Processed subscription status for %d users from %v to %v", len(users), start, end)
		})
	}()

	// 2.3 Credits 刷新处理
	wg.Add(1)
	go func() {
		defer wg.Done()
		processWithTimeRange(db, &types.Credits{}, "created_at", 1*time.Second, 24*time.Hour, func(db *gorm.DB, start, end time.Time) {
			users := getUniqueUsers(db, &types.Credits{}, "created_at", start, end)
			processUsersInParallel(db, users)
			log.Printf("Processed credits status for %d users from %v to %v", len(users), start, end)
		})
	}()

	wg.Wait()
}

// 更新债务状态
func updateDebtStatus(db *gorm.DB, userID string, newStatus types.DebtStatusType) {
	var debt types.Debt
	if err := db.Where("user_id = ?", userID).Preload("StatusRecords").First(&debt).Error; err != nil {
		debt = types.Debt{
			UserName:          "user-" + userID,
			UserID:            userID,
			AccountDebtStatus: newStatus,
			LastUpdateTime:    time.Now(),
		}
		db.Create(&debt)
		return
	}

	if debt.AccountDebtStatus != newStatus {
		newRecord := types.DebtStatusRecord{
			DebtID:        debt.ID,
			LastStatus:    debt.AccountDebtStatus,
			CurrentStatus: newStatus,
			UpdateTime:    time.Now(),
		}
		debt.StatusRecords = append(debt.StatusRecords, newRecord)
		debt.AccountDebtStatus = newStatus
		debt.LastUpdateTime = time.Now()
		db.Save(&debt)
	}
}

func calculateDebtStatus(balance int64) types.DebtStatusType {
	switch {
	case balance > 10000:
		return types.NormalPeriod
	case balance > 5000:
		return types.LowBalancePeriod
	case balance > 0:
		return types.CriticalBalancePeriod
	case balance <= 0 && balance > -10000:
		return types.DebtPeriod
	default:
		return types.NormalPeriod
	}
}

// 刷新用户的债务状态
func refreshDebtStatus(db *gorm.DB, userUID uuid.UUID) {
	var latestTx types.AccountTransaction
	if err := db.Where("user_uid = ?", userUID).Order("created_at desc").First(&latestTx).Error; err != nil {
		return
	}
	newStatus := calculateDebtStatus(latestTx.Balance)
	updateDebtStatus(db, userUID.String(), newStatus)
}

// 获取时间范围内的不重复用户 UUID
func getUniqueUsers(db *gorm.DB, table interface{}, timeField string, startTime, endTime time.Time) []uuid.UUID {
	var users []uuid.UUID
	db.Model(table).Where(fmt.Sprintf("%s BETWEEN ? AND ?", timeField), startTime, endTime).
		Distinct("user_uid").Pluck("user_uid", &users)
	return users
}

// 并行处理用户债务状态
func processUsersInParallel(db *gorm.DB, users []uuid.UUID) {
	var wg sync.WaitGroup
	for _, user := range users {
		wg.Add(1)
		go func(u uuid.UUID) {
			defer wg.Done()
			refreshDebtStatus(db, u)
		}(user)
	}
	wg.Wait()
}

// 时间区间轮询处理
func processWithTimeRange(db *gorm.DB, table interface{}, timeField string, interval time.Duration, initialDuration time.Duration, processFunc func(*gorm.DB, time.Time, time.Time)) {
	// 首次处理
	startTime := time.Now().Add(-initialDuration)
	endTime := time.Now()
	users := getUniqueUsers(db, table, timeField, startTime, endTime)
	processUsersInParallel(db, users)

	// 后续按时间区间轮询
	lastEndTime := endTime
	ticker := time.NewTicker(interval)
	for range ticker.C {
		startTime = lastEndTime
		endTime = time.Now()
		processFunc(db, startTime, endTime)
		lastEndTime = endTime
	}
}
