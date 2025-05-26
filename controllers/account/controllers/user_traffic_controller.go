package controllers

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/labring/sealos/controllers/pkg/database"

	"github.com/google/uuid"

	"github.com/labring/sealos/controllers/pkg/types"
	"gorm.io/gorm"
)

type UserTrafficController struct {
	TrafficDB database.Interface
	GlobalDB  *gorm.DB
	*AccountReconciler
}

func NewUserTrafficController(ar *AccountReconciler, trafficDBURI database.Interface) *UserTrafficController {
	return &UserTrafficController{
		TrafficDB:         trafficDBURI,
		GlobalDB:          ar.AccountV2.GetGlobalDB(),
		AccountReconciler: ar,
	}
}

func (c *UserTrafficController) BatchGetUserUID() (map[string]uuid.UUID, error) {
	allUser := make(map[string]uuid.UUID)
	allUserCr := make([]types.RegionUserCr, 0)
	err := c.AccountV2.GetLocalDB().Model(&types.RegionUserCr{}).Select(`"crName"`, `"userUid"`).Scan(&allUserCr).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get all user CRs: %v", err)
	}
	for _, userCr := range allUserCr {
		if userCr.UserUID == uuid.Nil {
			c.Logger.Info("user UID is nil, skipping", "crName", userCr.CrName)
			continue
		}
		allUser[userCr.CrName] = userCr.UserUID
	}
	return allUser, nil
}

func (c *UserTrafficController) processUserTraffic(resultMap map[string]int64) error {
	userUIDMap, err := c.BatchGetUserUID()
	if err != nil {
		c.Logger.Error(err, "failed to batch get user uids")
		return fmt.Errorf("failed to batch get user uids: %v", err)
	}

	var trafficRecords []*types.UserTimeRangeTraffic
	var skippedNamespaces []string
	now := time.Now()
	for namespace, totalBytes := range resultMap {
		if !strings.HasPrefix(namespace, "ns-") {
			continue
		}
		owner := strings.TrimPrefix(namespace, "ns-")
		userUID, exists := userUIDMap[owner]
		if !exists {
			skippedNamespaces = append(skippedNamespaces, namespace)
			continue
		}
		trafficRecords = append(trafficRecords, &types.UserTimeRangeTraffic{
			CreatedAt:     now,
			UpdatedAt:     now,
			NextCleanTime: now.AddDate(0, 1, 0),
			UserUID:       userUID,
			SentBytes:     totalBytes,
			Status:        types.UserTimeRangeTrafficStatusProcessing,
		})
	}
	if len(skippedNamespaces) > 0 {
		c.Logger.Info("skipped namespaces due to missing users", "namespaces", skippedNamespaces)
	}

	userUIDs := make([]uuid.UUID, 0, len(userUIDMap))
	for _, uid := range userUIDMap {
		userUIDs = append(userUIDs, uid)
	}
	var existingUserUIDs []uuid.UUID
	if err := c.GlobalDB.Model(&types.UserTimeRangeTraffic{}).Where("user_uid IN ?", userUIDs).Pluck("user_uid", &existingUserUIDs).Error; err != nil {
		c.Logger.Error(err, "failed to fetch existing user uids")
		return fmt.Errorf("failed to fetch existing user uids: %v", err)
	}
	existingUIDMap := make(map[uuid.UUID]struct{}, len(existingUserUIDs))
	for _, uid := range existingUserUIDs {
		existingUIDMap[uid] = struct{}{}
	}

	var toInsert, toUpdate []*types.UserTimeRangeTraffic
	for _, record := range trafficRecords {
		if _, exists := existingUIDMap[record.UserUID]; exists {
			toUpdate = append(toUpdate, record)
		} else {
			toInsert = append(toInsert, record)
		}
	}

	// 开启事务
	tx := c.GlobalDB.Begin()
	if tx.Error != nil {
		c.Logger.Error(tx.Error, "failed to begin transaction")
		return fmt.Errorf("failed to begin transaction: %v", tx.Error)
	}

	// 批量插入
	if len(toInsert) > 0 {
		if err := tx.Create(toInsert).Error; err != nil {
			c.Logger.Error(err, "failed to batch insert user traffic", "count", len(toInsert))
			tx.Rollback()
			return fmt.Errorf("failed to batch insert user traffic: %v", err)
		}
	}

	// 批量更新
	if len(toUpdate) > 0 {
		// 构造批量更新的 SQL CASE 语句
		caseStmt := "CASE user_uid "
		values := make([]interface{}, 0, len(toUpdate)*2)
		for _, record := range toUpdate {
			caseStmt += "WHEN ? THEN sent_bytes + ? "
			values = append(values, record.UserUID, record.SentBytes)
		}
		caseStmt += "END"
		if err := tx.Model(&types.UserTimeRangeTraffic{}).
			Where("user_uid IN ?", userUIDs).
			Updates(map[string]interface{}{
				"sent_bytes": gorm.Expr(caseStmt, values...),
				"updated_at": now,
			}).Error; err != nil {
			c.Logger.Error(err, "failed to batch update user traffic", "count", len(toUpdate))
			tx.Rollback()
			return fmt.Errorf("failed to batch update user traffic: %v", err)
		}
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		c.Logger.Error(err, "failed to commit transaction")
		return fmt.Errorf("failed to commit transaction: %v", err)
	}

	return nil
}

func (c *UserTrafficController) ProcessTrafficWithTimeRange() {
	c.Logger.Info("start user traffic controller")
	startTime := time.Now().Add(-1 * time.Minute)
	for range time.NewTicker(time.Minute).C {
		c.Logger.Info("time to process user traffic", "startTime", startTime)
		endTime := time.Now()
		result, err := c.TrafficDB.GetNamespaceTraffic(context.Background(), startTime, endTime)
		if err != nil {
			c.Logger.Error(err, "failed to get namespace traffic")
			endTime = startTime
		} else if len(result) > 0 {
			err = c.processUserTraffic(result)
			if err != nil {
				c.Logger.Error(err, "failed to process user traffic")
			} else {
				c.Logger.Info("successfully process user traffic", "count", len(result), "start", startTime, "end", endTime)
			}
		}
		startTime = endTime
	}
}
