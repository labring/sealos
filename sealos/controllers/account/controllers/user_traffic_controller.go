package controllers

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	utils2 "github.com/labring/sealos/controllers/account/controllers/utils"

	"github.com/labring/sealos/controllers/pkg/utils"

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

const (
	batchSize = 500 // Number of records per batch
)

// processUserTraffic processes user traffic data and commits in batches.
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

	// Process inserts in batches
	if err := c.processBatchInserts(toInsert); err != nil {
		return err
	}

	// Process updates in batches
	if err := c.processBatchUpdates(toUpdate, now); err != nil {
		return err
	}

	return nil
}

// processBatchInserts inserts records in batches.
func (c *UserTrafficController) processBatchInserts(records []*types.UserTimeRangeTraffic) error {
	if len(records) == 0 {
		return nil
	}
	for i := 0; i < len(records); i += batchSize {
		end := i + batchSize
		if end > len(records) {
			end = len(records)
		}
		batch := records[i:end]
		tx := c.GlobalDB.Begin()
		if tx.Error != nil {
			c.Logger.Error(tx.Error, "failed to begin transaction for insert batch", "batch_size", len(batch))
			return fmt.Errorf("failed to begin transaction for insert batch: %v", tx.Error)
		}
		if err := tx.Create(batch).Error; err != nil {
			tx.Rollback()
			c.Logger.Error(err, "failed to batch insert user traffic", "batch_size", len(batch))
			return fmt.Errorf("failed to batch insert user traffic: %v", err)
		}
		if err := tx.Commit().Error; err != nil {
			c.Logger.Error(err, "failed to commit transaction for insert batch", "batch_size", len(batch))
			return fmt.Errorf("failed to commit transaction for insert batch: %v", err)
		}
		c.Logger.Info("successfully inserted batch", "batch_size", len(batch), "start_index", i)
	}
	return nil
}

// processBatchUpdates updates records in batches.
func (c *UserTrafficController) processBatchUpdates(records []*types.UserTimeRangeTraffic, now time.Time) error {
	if len(records) == 0 {
		return nil
	}

	for i := 0; i < len(records); i += batchSize {
		end := i + batchSize
		if end > len(records) {
			end = len(records)
		}
		batch := records[i:end]

		tx := c.GlobalDB.Begin()
		if tx.Error != nil {
			c.Logger.Error(tx.Error, "failed to begin transaction for update batch", "batch_size", len(batch))
			return fmt.Errorf("failed to begin transaction for update batch: %v", tx.Error)
		}

		caseStmt := "CASE user_uid "
		values := make([]interface{}, 0, len(batch)*2)
		batchUserUIDs := make([]uuid.UUID, 0, len(batch))
		for _, record := range batch {
			caseStmt += "WHEN ? THEN sent_bytes + ? "
			values = append(values, record.UserUID, record.SentBytes)
			batchUserUIDs = append(batchUserUIDs, record.UserUID)
		}
		caseStmt += "END"

		if err := tx.Model(&types.UserTimeRangeTraffic{}).
			Where("user_uid IN ?", batchUserUIDs).
			Updates(map[string]interface{}{
				"sent_bytes": gorm.Expr(caseStmt, values...),
				"updated_at": now,
			}).Error; err != nil {
			tx.Rollback()
			c.Logger.Error(err, "failed to batch update user traffic", "batch_size", len(batch))
			return fmt.Errorf("failed to batch update user traffic: %v", err)
		}

		if err := tx.Commit().Error; err != nil {
			c.Logger.Error(err, "failed to commit transaction for update batch", "batch_size", len(batch))
			return fmt.Errorf("failed to commit transaction for update batch: %v", err)
		}
		c.Logger.Info("successfully updated batch", "batch_size", len(batch), "start_index", i)
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

func (c *UserTrafficController) sendSuspendUserTrafficRequest(userUID uuid.UUID) error {
	return c.sendUserTrafficRequest(userUID, "suspend")
}

func (c *UserTrafficController) sendResumeUserTrafficRequest(userUID uuid.UUID) error {
	return c.sendUserTrafficRequest(userUID, "resume")
}

func (c *UserTrafficController) sendUserTrafficRequest(userUID uuid.UUID, operator string) error {
	for _, domain := range c.allRegionDomain {
		token, err := c.jwtManager.GenerateToken(utils.JwtUser{
			Requester: AdminUserName,
		})
		if err != nil {
			return fmt.Errorf("failed to generate token: %w", err)
		}

		url := fmt.Sprintf("https://account-api.%s/admin/v1alpha1/%s-user-traffic?userUID=%s", domain, operator, userUID.String())

		var lastErr error
		backoffTime := time.Second

		maxRetries := 3
		for attempt := 1; attempt <= maxRetries; attempt++ {
			req, err := http.NewRequest("POST", url, nil)
			if err != nil {
				return fmt.Errorf("failed to create request: %w", err)
			}

			req.Header.Set("Authorization", "Bearer "+token)
			req.Header.Set("Content-Type", "application/json")
			client := http.Client{}

			resp, err := client.Do(req)
			if err != nil {
				lastErr = fmt.Errorf("failed to send request: %w", err)
			} else {
				defer resp.Body.Close()

				if resp.StatusCode == http.StatusOK {
					lastErr = nil
					break
				}
				body, err := io.ReadAll(resp.Body)
				if err != nil {
					lastErr = fmt.Errorf("unexpected status code: %d, failed to read response body: %w", resp.StatusCode, err)
				} else {
					lastErr = fmt.Errorf("unexpected status code: %d, response body: %s", resp.StatusCode, string(body))
				}
			}

			// 进行重试
			if attempt < maxRetries {
				fmt.Printf("Attempt %d failed: %v. Retrying in %v...\n", attempt, lastErr, backoffTime)
				time.Sleep(backoffTime)
				backoffTime *= 2 // 指数增长退避时间
			}
		}
		if lastErr != nil {
			return lastErr
		}
	}
	return nil
}

const (
	ProcessingBatchSize = 1000
	WorkerPoolSize      = 50
	CheckInterval       = 1 * time.Minute
	FreeTrafficLimit    = 10 * 1024 * 1024 * 1024
)

// UserTrafficMonitor monitors user traffic and processes suspensions
type UserTrafficMonitor struct {
	db                    *gorm.DB
	userTrafficController *UserTrafficController
	subscriptionCache     *utils2.SubscriptionCache
	processingUsers       sync.Map // Ongoing processing users: map[uuid.UUID]bool
	resumingUsers         sync.Map
	suspendQueue          chan uuid.UUID
	resumeQueue           chan uuid.UUID // Queue for users to suspend or resume
	workerPool            chan struct{}
	ctx                   context.Context
	cancel                context.CancelFunc
	wg                    sync.WaitGroup
}

// ProcessingUser holds user data for processing
type ProcessingUser struct {
	UserUID   uuid.UUID
	SentBytes int64
	UpdatedAt time.Time
}

// NewUserTrafficMonitor creates a new user traffic monitor
func NewUserTrafficMonitor(controller *UserTrafficController) (*UserTrafficMonitor, error) {
	ctx, cancel := context.WithCancel(context.Background())

	// Initialize SubscriptionCache with 1-minute update interval
	cache, err := utils2.NewSubscriptionCache(controller.GlobalDB, time.Minute)
	if err != nil {
		cancel()
		return nil, fmt.Errorf("failed to initialize subscription cache: %w", err)
	}

	monitor := &UserTrafficMonitor{
		db:                    controller.GlobalDB,
		userTrafficController: controller,
		subscriptionCache:     cache,
		suspendQueue:          make(chan uuid.UUID, 10000), // Large capacity queue
		resumeQueue:           make(chan uuid.UUID, 10000),
		workerPool:            make(chan struct{}, WorkerPoolSize),
		ctx:                   ctx,
		cancel:                cancel,
	}

	// Initialize worker pool
	for i := 0; i < WorkerPoolSize; i++ {
		monitor.workerPool <- struct{}{}
	}

	return monitor, nil
}

// Start begins the monitoring process
func (m *UserTrafficMonitor) Start() {
	log.Println("Starting user traffic monitoring system...")

	// Start async suspend processor
	m.wg.Add(1)
	go m.asyncSuspendProcessor()

	m.wg.Add(1)
	go m.asyncResumeProcessor()

	// Start periodic checker
	m.wg.Add(1)
	go m.periodicChecker()

	m.wg.Add(1)
	go m.ResumeUsers()
}

// Stop shuts down the monitoring system
func (m *UserTrafficMonitor) Stop() {
	log.Println("Stopping user traffic monitoring system...")
	m.cancel()
	close(m.suspendQueue)
	m.subscriptionCache.Close()
	m.wg.Wait()
}

// periodicChecker runs periodic checks for users exceeding traffic limits
func (m *UserTrafficMonitor) periodicChecker() {
	defer m.wg.Done()

	ticker := time.NewTicker(CheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-m.ctx.Done():
			return
		case <-ticker.C:
			start := time.Now()
			processed := m.checkAndProcessUsers()
			duration := time.Since(start)
			log.Printf("Processed %d users in %v", processed, duration)
		}
	}
}

// checkAndProcessUsers checks and processes users in batches
func (m *UserTrafficMonitor) checkAndProcessUsers() int {
	processed := 0
	lastUpdateTime := time.Now().Add(-CheckInterval)

	// Process in batches to avoid memory issues
	offset := 0
	for {
		users, err := m.getProcessingUsers(offset, ProcessingBatchSize, lastUpdateTime)
		if err != nil {
			log.Printf("Failed to get processing users: %v", err)
			break
		}
		if len(users) == 0 {
			break
		}
		log.Printf("Processing users len: %d", len(users))
		// Process this batch of users
		processedBatch := m.processUsersBatch(users)
		processed += processedBatch

		offset += ProcessingBatchSize

		// Stop if fewer than batch size, indicating no more data
		if len(users) < ProcessingBatchSize {
			break
		}
	}
	return processed
}

// getProcessingUsers fetches users with traffic exceeding the limit
func (m *UserTrafficMonitor) getProcessingUsers(offset, limit int, since time.Time) ([]ProcessingUser, error) {
	var results []ProcessingUser

	// Optimized query without subscription join
	query := `
	SELECT DISTINCT 
		user_uid,
		sent_bytes,
		updated_at
	FROM "UserTimeRangeTraffic"
	WHERE status = ?
	AND updated_at > ?
	AND sent_bytes > ?
	ORDER BY updated_at DESC
	LIMIT ? OFFSET ?
`

	err := m.db.Raw(query, types.UserTimeRangeTrafficStatusProcessing, since, FreeTrafficLimit, limit, offset).Scan(&results).Error
	if err != nil {
		return nil, fmt.Errorf("failed to query processing users: %w", err)
	}

	return results, nil
}

// processUsersBatch processes a batch of users
func (m *UserTrafficMonitor) processUsersBatch(users []ProcessingUser) int {
	processed := 0

	for _, user := range users {
		// Check if user is already being processed
		if _, exists := m.processingUsers.LoadOrStore(user.UserUID, true); exists {
			continue
		}

		// Check if user is on a Free plan using SubscriptionCache
		if entry, exists := m.subscriptionCache.GetEntry(user.UserUID); !exists || entry.PlanName != "Free" {
			m.processingUsers.Delete(user.UserUID)
			continue
		}

		// Submit to suspend queue
		select {
		case m.suspendQueue <- user.UserUID:
			processed++
		default:
			// Queue full, skip user for next iteration
			m.processingUsers.Delete(user.UserUID)
			log.Printf("Suspend queue full, skipping user: %s", user.UserUID)
		}
	}

	return processed
}

// asyncSuspendProcessor handles suspend requests asynchronously
func (m *UserTrafficMonitor) asyncSuspendProcessor() {
	defer m.wg.Done()
	for {
		select {
		case <-m.ctx.Done():
			return
		case userUID, ok := <-m.suspendQueue:
			if !ok {
				return
			}
			<-m.workerPool

			go func(uid uuid.UUID) {
				defer func() {
					m.workerPool <- struct{}{}
					m.processingUsers.Delete(uid)
				}()
				m.handleUserSuspension(uid)
			}(userUID)
		}
	}
}

// handleUserSuspension processes a user suspension
func (m *UserTrafficMonitor) handleUserSuspension(userUID uuid.UUID) {
	log.Printf("Starting user suspension processing: %s", userUID)

	// Call suspend API
	err := m.userTrafficController.sendSuspendUserTrafficRequest(userUID)
	if err != nil {
		log.Printf("Failed to suspend user traffic %s: %v", userUID, err)
		return
	}

	// Update status to UsedUp
	err = m.updateUserTrafficStatusUsedUp(userUID)
	if err != nil {
		log.Printf("Failed to update user status %s: %v", userUID, err)
		return
	}

	log.Printf("Successfully suspended user traffic: %s", userUID)
}

func (m *UserTrafficMonitor) updateUserTrafficStatusUsedUp(userUID uuid.UUID) error {
	result := m.db.Model(&types.UserTimeRangeTraffic{}).
		Where("user_uid = ?", userUID).
		Update("status", types.UserTimeRangeTrafficStatusUsedUp)
	if result.Error != nil {
		return fmt.Errorf("failed to update status: %w", result.Error)
	}
	return nil
}

func (m *UserTrafficMonitor) updateUserTrafficStatusClean(userUID uuid.UUID) error {
	result := m.db.Model(&types.UserTimeRangeTraffic{}).
		Where("user_uid = ?", userUID).
		Update("status", types.UserTimeRangeTrafficStatusProcessing).
		Update("sent_bytes", 0).
		Update("next_clean_time", time.Now().UTC().AddDate(0, 1, 0))

	if result.Error != nil {
		return fmt.Errorf("failed to update status: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("no records found to update")
	}
	return nil
}

func (m *UserTrafficMonitor) ResumeUsers() {
	defer m.wg.Done()
	log.Println("Starting user traffic resume process...")

	ticker := time.NewTicker(CheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-m.ctx.Done():
			log.Println("Stopping user traffic resume process...")
			return
		case <-ticker.C:
			start := time.Now()
			processed := m.processResumeUsers()
			duration := time.Since(start)
			log.Printf("Processed %d users for resume in %v", processed, duration)
		}
	}
}

// processResumeUsers handles the resumption logic for eligible users
func (m *UserTrafficMonitor) processResumeUsers() int {
	processed := 0
	offset := 0
	batchSize := ProcessingBatchSize

	// Get all non-Free plan users with Normal status from cache
	eligibleUsers := m.getEligibleUsersFromCache()

	for {
		users, err := m.getUsedUpUsers(offset, batchSize)
		if err != nil {
			log.Printf("Failed to get used_up users: %v", err)
			break
		}
		if len(users) == 0 {
			break
		}

		processedBatch := m.processResumeBatch(users, eligibleUsers)
		processed += processedBatch

		offset += batchSize
		if len(users) < batchSize {
			break
		}
	}

	// Process users approaching NextCleanTime
	processed += m.processNextCleanTimeUsers()

	return processed
}

// getEligibleUsersFromCache retrieves users with non-Free plans and Normal status
func (m *UserTrafficMonitor) getEligibleUsersFromCache() map[uuid.UUID]struct{} {
	eligibleUsers := make(map[uuid.UUID]struct{})
	entries := m.subscriptionCache.GetAllEntries()
	for _, entry := range entries {
		if entry.PlanName != types.FreeSubscriptionPlanName && entry.Status == types.SubscriptionStatusNormal {
			eligibleUsers[entry.UserUID] = struct{}{}
		}
	}
	return eligibleUsers
}

// getUsedUpUsers fetches users with used_up status
func (m *UserTrafficMonitor) getUsedUpUsers(offset, limit int) ([]ProcessingUser, error) {
	var results []ProcessingUser
	query := `
		SELECT 
			user_uid,
			sent_bytes,
			updated_at
		FROM "UserTimeRangeTraffic"
		WHERE status = ?
		ORDER BY updated_at DESC
		LIMIT ? OFFSET ?
	`
	err := m.db.Raw(query, types.UserTimeRangeTrafficStatusUsedUp, limit, offset).Scan(&results).Error
	if err != nil {
		return nil, fmt.Errorf("failed to query used_up users: %w", err)
	}
	return results, nil
}

// processResumeBatch processes a batch of users for resumption
func (m *UserTrafficMonitor) processResumeBatch(users []ProcessingUser, eligibleUsers map[uuid.UUID]struct{}) int {
	processed := 0

	for _, user := range users {
		// Check if user is already being processed
		if _, exists := m.resumingUsers.LoadOrStore(user.UserUID, true); exists {
			continue
		}

		// Check if user is eligible for resumption (non-Free plan and Normal status)
		if _, exists := eligibleUsers[user.UserUID]; !exists {
			m.resumingUsers.Delete(user.UserUID)
			continue
		}

		// Submit to suspend queue for async processing
		select {
		case m.resumeQueue <- user.UserUID:
			processed++
		default:
			m.resumingUsers.Delete(user.UserUID)
			log.Printf("Resume queue full, skipping user: %s", user.UserUID)
		}
	}

	return processed
}

// processNextCleanTimeUsers handles users approaching NextCleanTime
func (m *UserTrafficMonitor) processNextCleanTimeUsers() int {
	processed := 0
	offset := 0
	batchSize := ProcessingBatchSize
	threshold := time.Now().Add(time.Hour)

	for {
		var users []struct {
			UserUID       uuid.UUID
			NextCleanTime time.Time
		}
		query := `
			SELECT 
				user_uid,
				next_clean_time
			FROM "UserTimeRangeTraffic"
			WHERE next_clean_time <= ?
			ORDER BY next_clean_time DESC
			LIMIT ? OFFSET ?
		`
		err := m.db.Raw(query, threshold, batchSize, offset).Scan(&users).Error
		if err != nil {
			log.Printf("Failed to query NextCleanTime users: %v", err)
			break
		}
		if len(users) == 0 {
			break
		}

		for _, user := range users {
			if _, exists := m.resumingUsers.LoadOrStore(user.UserUID, true); exists {
				continue
			}

			select {
			case m.resumeQueue <- user.UserUID:
				processed++
			default:
				m.resumingUsers.Delete(user.UserUID)
				log.Printf("Resume queue full, skipping user: %s", user.UserUID)
			}
		}

		offset += batchSize
		if len(users) < batchSize {
			break
		}
	}

	return processed
}

// StartResumeProcessor starts the async resume processor
func (m *UserTrafficMonitor) StartResumeProcessor() {
	m.wg.Add(1)
	go m.asyncResumeProcessor()
}

// asyncResumeProcessor handles resume requests asynchronously
func (m *UserTrafficMonitor) asyncResumeProcessor() {
	defer m.wg.Done()
	for {
		select {
		case <-m.ctx.Done():
			return
		case userUID, ok := <-m.resumeQueue:
			if !ok {
				return
			}
			<-m.workerPool

			go func(uid uuid.UUID) {
				defer func() {
					m.workerPool <- struct{}{}
					m.resumingUsers.Delete(uid)
				}()
				m.handleUserResumption(uid)
			}(userUID)
		}
	}
}

// handleUserResumption processes a user resumption
func (m *UserTrafficMonitor) handleUserResumption(userUID uuid.UUID) {
	log.Printf("Starting user resumption processing: %s", userUID)

	// Call resume API
	err := m.userTrafficController.sendResumeUserTrafficRequest(userUID)
	if err != nil {
		log.Printf("Failed to resume user traffic %s: %v", userUID, err)
		return
	}

	// Update status to Processing
	err = m.updateUserTrafficStatusClean(userUID)
	if err != nil {
		log.Printf("Failed to update user status %s: %v", userUID, err)
		return
	}

	log.Printf("Successfully resumed user traffic: %s", userUID)
}

// MonitorStats holds monitoring statistics
type MonitorStats struct {
	ProcessedUsers     int64         `json:"processed_users"`
	PendingUsers       int64         `json:"pending_users"`
	CacheHitRate       float64       `json:"cache_hit_rate"`
	LastProcessTime    time.Time     `json:"last_process_time"`
	AverageProcessTime time.Duration `json:"average_process_time"`
}

// GetStats returns monitoring statistics
func (m *UserTrafficMonitor) GetStats() MonitorStats {
	pendingCount := len(m.suspendQueue)

	return MonitorStats{
		PendingUsers: int64(pendingCount),
	}
}

// Suggested database indexes
/*
CREATE INDEX CONCURRENTLY idx_user_time_range_traffic_status_updated
ON user_time_range_traffic (status, updated_at)
WHERE status = 'processing';

CREATE INDEX CONCURRENTLY idx_user_time_range_traffic_user_uid_status
ON user_time_range_traffic (user_uid, status);

CREATE INDEX CONCURRENTLY idx_user_time_range_traffic_sent_bytes
ON user_time_range_traffic (sent_bytes)
WHERE sent_bytes > 10737418240; -- 10GB
*/
