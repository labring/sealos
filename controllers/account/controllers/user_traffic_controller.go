package controllers

import (
	"context"
	"fmt"
	"runtime"
	"sort"
	"strings"
	"sync"
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

	// cache related
	userUIDCache    map[string]uuid.UUID
	cacheLastUpdate time.Time
	cacheMutex      sync.RWMutex

	// configuration parameters
	batchSize      int
	workerCount    int
	cacheExpireDur time.Duration
}

func NewUserTrafficController(ar *AccountReconciler, trafficDBURI database.Interface) *UserTrafficController {
	return &UserTrafficController{
		TrafficDB:         trafficDBURI,
		GlobalDB:          ar.AccountV2.GetGlobalDB(),
		AccountReconciler: ar,
		userUIDCache:      make(map[string]uuid.UUID),
		batchSize:         1000,                 // batch operation size
		workerCount:       runtime.NumCPU() * 2, // concurrent number
		cacheExpireDur:    5 * time.Minute,      // cache expiration time
	}
}

// batch acquisition of user uid with cache
func (c *UserTrafficController) BatchGetUserUIDWithCache() (map[string]uuid.UUID, error) {
	c.cacheMutex.RLock()
	if time.Since(c.cacheLastUpdate) < c.cacheExpireDur && len(c.userUIDCache) > 0 {
		result := make(map[string]uuid.UUID, len(c.userUIDCache))
		for k, v := range c.userUIDCache {
			result[k] = v
		}
		c.cacheMutex.RUnlock()
		return result, nil
	}
	c.cacheMutex.RUnlock()

	// the cache is invalid retrieve it again
	c.cacheMutex.Lock()
	defer c.cacheMutex.Unlock()

	// double check
	if time.Since(c.cacheLastUpdate) < c.cacheExpireDur && len(c.userUIDCache) > 0 {
		result := make(map[string]uuid.UUID, len(c.userUIDCache))
		for k, v := range c.userUIDCache {
			result[k] = v
		}
		return result, nil
	}

	var results []struct {
		CrName  string    `gorm:"column:crName"`
		UserUID uuid.UUID `gorm:"column:userUid"`
	}

	err := c.AccountV2.GetLocalDB().Raw(`
		SELECT "crName", "userUid" 
		FROM "UserCr" 
		WHERE "userUid" IS NOT NULL AND "userUid" != '00000000-0000-0000-0000-000000000000'
	`).Scan(&results).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get all user CRs: %v", err)
	}

	// update the cache
	c.userUIDCache = make(map[string]uuid.UUID, len(results))
	for _, result := range results {
		if result.UserUID != uuid.Nil {
			c.userUIDCache[result.CrName] = result.UserUID
		}
	}
	c.cacheLastUpdate = time.Now()

	resultMap := make(map[string]uuid.UUID, len(c.userUIDCache))
	for k, v := range c.userUIDCache {
		resultMap[k] = v
	}

	return resultMap, nil
}

type trafficTask struct {
	userUID   uuid.UUID
	sentBytes int64
}

// concurrently process user traffic data
func (c *UserTrafficController) processUserTrafficOptimized(resultMap map[string]int64) error {
	if len(resultMap) == 0 {
		return nil
	}

	// obtain the user uid mapping using cache
	userUIDMap, err := c.BatchGetUserUIDWithCache()
	if err != nil {
		c.Logger.Error(err, "failed to batch get user uids")
		return fmt.Errorf("failed to batch get user uids: %v", err)
	}

	userTrafficMap := make(map[uuid.UUID]int64)
	var skippedCount int

	for namespace, totalBytes := range resultMap {
		if !strings.HasPrefix(namespace, "ns-") {
			continue
		}
		owner := strings.TrimPrefix(namespace, "ns-")
		userUID, exists := userUIDMap[owner]
		if !exists {
			skippedCount++
			continue
		}
		userTrafficMap[userUID] += totalBytes
	}

	if skippedCount > 0 {
		c.Logger.Info("skipped namespaces due to missing users", "count", skippedCount)
	}
	if len(userTrafficMap) == 0 {
		c.Logger.Info("no valid user traffic data to process")
		return nil
	}

	// batch check the existing records
	userUIDs := make([]uuid.UUID, 0, len(userTrafficMap))
	for uid := range userTrafficMap {
		userUIDs = append(userUIDs, uid)
	}

	existingUIDMap, err := c.batchCheckExistingUsers(userUIDs)
	if err != nil {
		return fmt.Errorf("failed to check existing users: %v", err)
	}

	// separate the insertion and update operations
	now := time.Now()
	var toInsert []*types.UserTimeRangeTraffic
	var toUpdate []trafficTask

	for userUID, sentBytes := range userTrafficMap {
		if existingUIDMap[userUID] {
			toUpdate = append(toUpdate, trafficTask{
				userUID:   userUID,
				sentBytes: sentBytes,
			})
		} else {
			toInsert = append(toInsert, &types.UserTimeRangeTraffic{
				CreatedAt:     now,
				UpdatedAt:     now,
				NextCleanTime: now.AddDate(0, 1, 0),
				UserUID:       userUID,
				SentBytes:     sentBytes,
				Status:        types.UserTimeRangeTrafficStatusProcessing,
			})
		}
	}

	// concurrent insertion and update are performed
	var wg sync.WaitGroup
	errChan := make(chan error, 2)

	// concurrent insertion
	if len(toInsert) > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := c.batchInsertTraffic(toInsert, now); err != nil {
				errChan <- fmt.Errorf("batch insert failed: %v", err)
			}
		}()
	}

	// concurrent update
	if len(toUpdate) > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := c.batchUpdateTraffic(toUpdate, now); err != nil {
				errChan <- fmt.Errorf("batch update failed: %v", err)
			}
		}()
	}

	wg.Wait()
	close(errChan)

	// check for errors
	for err := range errChan {
		if err != nil {
			return err
		}
	}

	c.Logger.Info("successfully processed user traffic",
		"total", len(userTrafficMap),
		"inserted", len(toInsert),
		"updated", len(toUpdate))

	return nil
}

// batch check existing users
func (c *UserTrafficController) batchCheckExistingUsers(userUIDs []uuid.UUID) (map[uuid.UUID]bool, error) {
	if len(userUIDs) == 0 {
		return make(map[uuid.UUID]bool), nil
	}

	var existingUIDs []uuid.UUID
	err := c.GlobalDB.Model(&types.UserTimeRangeTraffic{}).
		Where("user_uid IN ?", userUIDs).
		Pluck("user_uid", &existingUIDs).Error

	if err != nil {
		return nil, fmt.Errorf("failed to fetch existing user uids: %v", err)
	}

	existingMap := make(map[uuid.UUID]bool, len(existingUIDs))
	for _, uid := range existingUIDs {
		existingMap[uid] = true
	}

	return existingMap, nil
}

// batch insert traffic records
func (c *UserTrafficController) batchInsertTraffic(records []*types.UserTimeRangeTraffic, now time.Time) error {
	if len(records) == 0 {
		return nil
	}

	for i := 0; i < len(records); i += c.batchSize {
		end := i + c.batchSize
		if end > len(records) {
			end = len(records)
		}

		batch := records[i:end]
		if err := c.GlobalDB.CreateInBatches(batch, c.batchSize).Error; err != nil {
			c.Logger.Error(err, "failed to batch insert user traffic", "batch_size", len(batch))
			return err
		}
	}
	return nil
}

func (c *UserTrafficController) batchUpdateTraffic(updates []trafficTask, now time.Time) error {
	if len(updates) == 0 {
		return nil
	}

	// Sort the update tasks by userUID to improve the efficiency of database locks
	sort.Slice(updates, func(i, j int) bool {
		return updates[i].userUID.String() < updates[j].userUID.String()
	})

	// update in batches
	for i := 0; i < len(updates); i += c.batchSize {
		end := i + c.batchSize
		if end > len(updates) {
			end = len(updates)
		}

		batch := updates[i:end]
		if err := c.executeBatchUpdate(batch, now); err != nil {
			return err
		}
	}

	return nil
}

// perform batch updates
func (c *UserTrafficController) executeBatchUpdate(batch []trafficTask, now time.Time) error {
	if len(batch) == 0 {
		return nil
	}

	// batch updates using gorm
	return c.executeBatchUpdateWithGORM(batch, now)

	// If native SQL needs to be used, the following implementation can be used
	// return c.executeBatchUpdateWithRawSQL(batch, now)
}

// Batch updates using GORM (with good performance and type safety)
func (c *UserTrafficController) executeBatchUpdateWithGORM(batch []trafficTask, now time.Time) error {
	userUIDs := make([]uuid.UUID, len(batch))
	for i, update := range batch {
		userUIDs[i] = update.userUID
	}

	var caseStmt strings.Builder
	caseStmt.WriteString("CASE user_uid ")
	values := make([]interface{}, 0, len(batch)*2)

	for _, update := range batch {
		caseStmt.WriteString("WHEN ? THEN sent_bytes + ? ")
		values = append(values, update.userUID, update.sentBytes)
	}
	caseStmt.WriteString("END")

	if err := c.GlobalDB.Model(&types.UserTimeRangeTraffic{}).
		Where("user_uid IN ?", userUIDs).
		Updates(map[string]interface{}{
			"sent_bytes": gorm.Expr(caseStmt.String(), values...),
			"updated_at": now,
		}).Error; err != nil {
		c.Logger.Error(err, "failed to batch update user traffic", "count", len(batch))
		return err
	}
	return nil
}

// Batch update using native SQL
//func (c *UserTrafficController) executeBatchUpdateWithRawSQL(batch []trafficTask, now time.Time) error {
//	var caseStmt strings.Builder
//	caseStmt.WriteString("CASE user_uid ")
//
//	caseArgs := make([]interface{}, 0, len(batch)*2)
//	userUIDs := make([]uuid.UUID, len(batch))
//
//	for i, update := range batch {
//		caseStmt.WriteString("WHEN $%d THEN sent_bytes + $%d ")
//		caseArgs = append(caseArgs, update.userUID, update.sentBytes)
//		userUIDs[i] = update.userUID
//	}
//	caseStmt.WriteString("END")
//
//	placeholderStart := len(caseArgs) + 1
//	sql := fmt.Sprintf(`
//		UPDATE "UserTimeRangeTraffic"
//		SET sent_bytes = %s,
//		    updated_at = $%d
//		WHERE user_uid = ANY($%d)`,
//		caseStmt.String(), placeholderStart, placeholderStart+1)
//
//	// 重新编号占位符
//	for i := 0; i < len(caseArgs); i += 2 {
//		sql = strings.Replace(sql, fmt.Sprintf("$%d", i+1), fmt.Sprintf("$%d", i+1), 1)
//		sql = strings.Replace(sql, fmt.Sprintf("$%d", i+2), fmt.Sprintf("$%d", i+2), 1)
//	}
//
//	finalArgs := make([]interface{}, 0, len(caseArgs)+2)
//	finalArgs = append(finalArgs, caseArgs...)
//	finalArgs = append(finalArgs, now)
//	finalArgs = append(finalArgs, userUIDs)
//
//	if err := c.GlobalDB.Exec(sql, finalArgs...).Error; err != nil {
//		c.Logger.Error(err, "failed to batch update user traffic with raw SQL", "count", len(batch))
//		return err
//	}
//
//	return nil
//}

func (c *UserTrafficController) ProcessTrafficWithTimeRange() {
	c.Logger.Info("start optimized user traffic controller",
		"worker_count", c.workerCount,
		"batch_size", c.batchSize,
		"cache_expire", c.cacheExpireDur)

	startTime := time.Now().Add(-1 * time.Minute)
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		processStart := time.Now()
		c.Logger.Info("time to process user traffic", "startTime", startTime)

		endTime := time.Now()
		result, err := c.TrafficDB.GetNamespaceTraffic(context.Background(), startTime, endTime)

		if err != nil {
			c.Logger.Error(err, "failed to get namespace traffic")
			endTime = startTime
		} else if len(result) > 0 {
			err = c.processUserTrafficOptimized(result)
			if err != nil {
				c.Logger.Error(err, "failed to process user traffic")
			} else {
				processDuration := time.Since(processStart)
				c.Logger.Info("successfully processed user traffic",
					"count", len(result),
					"start", startTime,
					"end", endTime,
					"duration", processDuration,
					"records_per_second", float64(len(result))/processDuration.Seconds())
			}
		} else {
			c.Logger.Info("no traffic data to process")
		}

		startTime = endTime
	}
}

func (c *UserTrafficController) RefreshCache() error {
	c.cacheMutex.Lock()
	defer c.cacheMutex.Unlock()

	c.userUIDCache = make(map[string]uuid.UUID)
	c.cacheLastUpdate = time.Time{}

	_, err := c.BatchGetUserUIDWithCache()
	return err
}

func (c *UserTrafficController) GetCacheStats() map[string]interface{} {
	c.cacheMutex.RLock()
	defer c.cacheMutex.RUnlock()

	return map[string]interface{}{
		"cache_size":        len(c.userUIDCache),
		"last_update":       c.cacheLastUpdate,
		"cache_age_seconds": time.Since(c.cacheLastUpdate).Seconds(),
		"is_expired":        time.Since(c.cacheLastUpdate) > c.cacheExpireDur,
	}
}
