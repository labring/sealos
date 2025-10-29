package api

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/pay"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/dao"
	"github.com/labring/sealos/service/account/helper"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
	corev1 "k8s.io/api/core/v1"
	types2 "k8s.io/apimachinery/pkg/types"
)

// AdminGetAccountWithWorkspaceID GetAccount
// @Summary Get user account
// @Description Get user account
// @Tags Account
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "successfully retrieved user account"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get user account"
// @Router /admin/v1alpha1/account [get]
func AdminGetAccountWithWorkspaceID(c *gin.Context) {
	err := authenticateAdminRequest(c)
	if err != nil {
		c.JSON(
			http.StatusUnauthorized,
			helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)},
		)
		return
	}
	workspace, exist := c.GetQuery("namespace")
	if !exist || workspace == "" {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: "empty workspace"})
		return
	}
	ns := &corev1.Namespace{}
	err = dao.K8sManager.GetClient().
		Get(context.Background(), types2.NamespacedName{Name: workspace}, ns)
	if err != nil {
		c.JSON(
			http.StatusInternalServerError,
			helper.ErrorMessage{
				Error: fmt.Sprintf("failed to get workspace %s: %v", workspace, err),
			},
		)
		return
	}
	if _, exist = ns.Annotations[types.WorkspaceSubscriptionStatusAnnoKey]; exist {
		totalQuota, remainQuota, err := dao.DBClient.GetWorkspaceRemainingAIQuota(workspace)
		if err != nil {
			c.JSON(
				http.StatusInternalServerError,
				gin.H{"error": fmt.Sprintf("failed to get workspace remaining quota: %v", err)},
			)
			return
		}
		userUID, err := dao.DBClient.GetWorkspaceUserUID(workspace)
		if err != nil {
			c.JSON(
				http.StatusInternalServerError,
				gin.H{"error": fmt.Sprintf("failed to get workspace userUID: %v", err)},
			)
			return
		}
		c.JSON(http.StatusOK, gin.H{
			// for subscription, there is no balance field
			"userUID":               userUID,
			"workspaceSubscription": true,
			"totalAIQuota":          totalQuota,
			"remainAIQuota":         remainQuota,
		})
		return
	}
	account, err := dao.DBClient.GetAccountWithWorkspace(workspace)
	if err != nil {
		c.JSON(
			http.StatusInternalServerError,
			gin.H{"error": fmt.Sprintf("failed to get account : %v", err)},
		)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"userUID":               account.UserUID,
		"balance":               account.Balance - account.DeductionBalance,
		"workspaceSubscription": false,
	})
}

// AdminChargeBilling ChargeBilling
// @Summary Charge billing
// @Description Charge billing
// @Tags Account
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "successfully charged billing"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to charge billing"
// @Router /admin/v1alpha1/charge [post]
func AdminChargeBilling(c *gin.Context) {
	err := authenticateAdminRequest(c)
	if err != nil {
		c.JSON(
			http.StatusUnauthorized,
			helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)},
		)
		return
	}
	billingReq, err := helper.ParseAdminChargeBillingReq(c)
	if err != nil {
		c.JSON(
			http.StatusBadRequest,
			helper.ErrorMessage{Error: fmt.Sprintf("failed to parse request : %v", err)},
		)
		return
	}
	helper.CallCounter.WithLabelValues("ChargeBilling", billingReq.UserUID.String()).Inc()
	// if Namespace is workspace subscription, should charge to workspace ai quota
	isSubscription, err := GetWorkspaceIsSubscription(billingReq.Namespace)
	if err != nil {
		c.JSON(
			http.StatusInternalServerError,
			gin.H{"error": fmt.Sprintf("failed to get workspace subscription status: %v", err)},
		)
		return
	}
	if isSubscription {
		err = dao.DBClient.ChargeWorkspaceAIQuota(billingReq.Amount, billingReq.Namespace)
	} else {
		err = dao.DBClient.ChargeBilling(billingReq)
	}
	if err != nil {
		c.JSON(
			http.StatusInternalServerError,
			gin.H{"error": fmt.Sprintf("failed to charge billing : %v", err)},
		)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "successfully charged billing",
	})
}

// WorkspaceSubscriptionCache 工作空间订阅状态缓存
type WorkspaceSubscriptionCache struct {
	cache map[string]*cacheEntry
	mutex sync.RWMutex
}

// cacheEntry 缓存条目，记录最后访问时间用于LRU清理
type cacheEntry struct {
	lastAccessed time.Time
}

var (
	subscriptionCache     *WorkspaceSubscriptionCache
	subscriptionCacheOnce sync.Once
)

// 缓存配置常量
const (
	// 缓存清理间隔 - 30分钟
	cacheCleanupInterval = 30 * time.Minute
	// 未使用时间阈值 - 如果超过2小时未访问则清理
	unusedThreshold = 2 * time.Hour
	// 最大缓存条目数
	maxCacheEntries = 10000
)

// getSubscriptionCache 获取缓存实例（单例模式）
func getSubscriptionCache() *WorkspaceSubscriptionCache {
	subscriptionCacheOnce.Do(func() {
		subscriptionCache = &WorkspaceSubscriptionCache{
			cache: make(map[string]*cacheEntry),
		}
		// 启动定期清理过期缓存的 goroutine
		go subscriptionCache.startCleanupWorker()
	})
	return subscriptionCache
}

// get 从缓存中获取值，订阅状态一旦缓存就永远有效
func (c *WorkspaceSubscriptionCache) get(key string) bool {
	c.mutex.Lock() // 使用写锁因为需要更新lastAccessed
	defer c.mutex.Unlock()

	entry, exists := c.cache[key]
	if !exists {
		return false
	}

	// 更新最后访问时间
	entry.lastAccessed = time.Now()
	return true
}

// set 设置缓存值，只缓存订阅状态为true的工作空间
func (c *WorkspaceSubscriptionCache) set(key string) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	// 如果缓存条目过多，清理长期未使用的条目
	if len(c.cache) >= maxCacheEntries {
		c.cleanupUnusedEntries()
	}

	c.cache[key] = &cacheEntry{
		lastAccessed: time.Now(),
	}
}

// cleanupUnusedEntries 清理长期未使用的缓存条目（调用时需要持有写锁）
func (c *WorkspaceSubscriptionCache) cleanupUnusedEntries() {
	now := time.Now()
	for key, entry := range c.cache {
		if now.Sub(entry.lastAccessed) > unusedThreshold {
			delete(c.cache, key)
		}
	}
}

// startCleanupWorker 启动定期清理工作协程
func (c *WorkspaceSubscriptionCache) startCleanupWorker() {
	ticker := time.NewTicker(cacheCleanupInterval)
	defer ticker.Stop()

	for range ticker.C {
		c.mutex.Lock()
		c.cleanupUnusedEntries()
		c.mutex.Unlock()
	}
}

// GetWorkspaceIsSubscription 获取工作空间是否为订阅状态
// 使用缓存和读写锁确保并发安全性，只缓存订阅状态的工作空间
func GetWorkspaceIsSubscription(workspace string) (bool, error) {
	if workspace == "" {
		return false, errors.New("workspace name cannot be empty")
	}

	cache := getSubscriptionCache()

	// 先尝试从缓存中获取，如果存在说明一定是订阅状态
	if cache.get(workspace) {
		return true, nil
	}
	ns := &corev1.Namespace{}
	err := dao.K8sManager.GetClient().
		Get(context.Background(), types2.NamespacedName{Name: workspace}, ns)
	if err != nil {
		return false, fmt.Errorf("failed to get workspace %s: %w", workspace, err)
	}

	// 检查是否有订阅状态注解
	_, isSubscription := ns.Annotations[types.WorkspaceSubscriptionStatusAnnoKey]

	// 只缓存订阅状态的工作空间，因为订阅是不可逆的
	if isSubscription {
		cache.set(workspace)
	}

	return isSubscription, nil
}

// AdminGetUserRealNameInfo
// @Summary Get user real name info
// @Description Get user real name info
// @Tags Account
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "successfully retrieved user real name info"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to get user real name info"
// @Router /admin/v1alpha1/real-name-info [get]
func AdminGetUserRealNameInfo(c *gin.Context) {
	err := authenticateAdminRequest(c)
	if err != nil {
		c.JSON(
			http.StatusUnauthorized,
			helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)},
		)
		return
	}
	userUID, exist := c.GetQuery("userUID")
	if !exist || userUID == "" {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: "empty userUID"})
		return
	}
	userID, err := dao.DBClient.GetUserID(types.UserQueryOpts{UID: uuid.MustParse(userUID)})
	if err != nil {
		c.JSON(
			http.StatusInternalServerError,
			helper.ErrorMessage{Error: fmt.Sprintf("failed to get user ID: %v", err)},
		)
		return
	}
	ck := dao.DBClient.GetCockroach()

	userRealNameInfo, err := ck.GetUserRealNameInfoByUserID(userID)

	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(
			http.StatusInternalServerError,
			helper.ErrorMessage{Error: fmt.Sprintf("failed to get user real name info: %v", err)},
		)
		return
	}

	enterpriseRealNameInfo, err := ck.GetEnterpriseRealNameInfoByUserID(userID)

	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(
			http.StatusInternalServerError,
			helper.ErrorMessage{
				Error: fmt.Sprintf("failed to get enterprise real name info: %v", err),
			},
		)
		return
	}

	isVerified := (userRealNameInfo != nil && userRealNameInfo.IsVerified) ||
		(enterpriseRealNameInfo != nil && enterpriseRealNameInfo.IsVerified)

	c.JSON(http.StatusOK, gin.H{
		"userUID":    userUID,
		"isRealName": isVerified,
	})
}

// ActiveBilling
// @Summary Active billing
// @Description Active billing
// @Tags Account
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "successfully activated billing"
// @Failure 401 {object} map[string]interface{} "authenticate error"
// @Failure 500 {object} map[string]interface{} "failed to activate billing"
// @Router /admin/v1alpha1/active [post]
// func AdminActiveBilling(c *gin.Context) {
//	err := authenticateAdminRequest(c)
//	if err != nil {
//		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
//		return
//	}
//	billingReq, err := dao.ParseAdminActiveBillingReq(c)
//	if err != nil {
//		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: fmt.Sprintf("failed to parse request : %v", err)})
//		return
//	}
//	dao.ActiveBillingTask.AddTask(billingReq)
//	c.JSON(http.StatusOK, gin.H{
//		"message": "successfully activated billing",
//	})
//}

const AdminUserName = "sealos-admin"

func authenticateAdminRequest(c *gin.Context) error {
	tokenString := c.GetHeader("Authorization")
	if tokenString == "" {
		return errors.New("null auth found")
	}
	token := strings.TrimPrefix(tokenString, "Bearer ")
	user, err := dao.JwtMgr.ParseUser(token)
	if err != nil {
		return fmt.Errorf("failed to parse user: %w", err)
	}
	if user == nil {
		return errors.New("user not found")
	}
	if user.Requester != AdminUserName {
		return errors.New("user is not admin")
	}
	return nil
}

func AdminSuspendUserTraffic(c *gin.Context) {
	adminUserTrafficOperator(c, SuspendNetworkNamespaceAnnoStatus)
}

func AdminResumeUserTraffic(c *gin.Context) {
	adminUserTrafficOperator(c, ResumeNetworkNamespaceAnnoStatus)
}

func adminUserTrafficOperator(c *gin.Context, networkStatus string) {
	err := authenticateAdminRequest(c)
	if err != nil {
		c.JSON(
			http.StatusUnauthorized,
			helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)},
		)
		return
	}
	userUIDStr, exist := c.GetQuery("userUID")
	if !exist || userUIDStr == "" {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: "empty userUID"})
		return
	}
	userUID, err := uuid.Parse(userUIDStr)
	if err != nil {
		c.JSON(
			http.StatusBadRequest,
			helper.ErrorMessage{Error: fmt.Sprintf("invalid userUID format: %v", err)},
		)
		return
	}
	owner, err := dao.DBClient.GetUserCrName(types.UserQueryOpts{UID: userUID})
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(
			http.StatusInternalServerError,
			helper.ErrorMessage{Error: fmt.Sprintf("failed to get user cr name: %v", err)},
		)
		return
	}
	if owner == "" {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}
	namespaces, err := getOwnNsListWithClt(dao.K8sManager.GetClient(), owner)
	if err != nil {
		c.JSON(
			http.StatusInternalServerError,
			helper.ErrorMessage{Error: fmt.Sprintf("get own namespace list failed: %v", err)},
		)
		return
	}
	if len(namespaces) == 0 {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}
	if err = updateNetworkNamespaceStatus(context.Background(), dao.K8sManager.GetClient(), networkStatus, namespaces); err != nil {
		c.JSON(
			http.StatusInternalServerError,
			helper.ErrorMessage{
				Error: fmt.Sprintf("failed to flush user resource status: %v", err),
			},
		)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func AdminPaymentRefund(c *gin.Context) {
	// 1. 管理员鉴权
	if err := authenticateAdminRequest(c); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{
			Error: fmt.Sprintf("authenticate error: %v", err),
		})
		return
	}

	// 2. 解析前端传来的 JSON
	var refundData types.PaymentRefund
	if err := c.ShouldBindJSON(&refundData); err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{
			Error: fmt.Sprintf("invalid request body: %v", err),
		})
		return
	}
	postDo := func(p types.PaymentRefund) error {
		svc, err := pay.NewPayHandler(string(p.Method))
		if err != nil {
			return fmt.Errorf("new payment handler failed: %w", err)
		}
		_, _, err = svc.RefundPayment(pay.RefundOption{
			TradeNo:  p.TradeNo,
			Amount:   p.RefundAmount,
			RefundID: p.RefundNo,
		})
		if err != nil {
			return fmt.Errorf("failed to refund payment: %w", err)
		}
		return nil
	}
	// 3. 调用 RefundAmount
	if err := dao.DBClient.RefundAmount(refundData, postDo); err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{
			Error: fmt.Sprintf("refund processing error: %v", err),
		})
		return
	}

	// 4. 成功返回
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func AdminCreateCorporate(c *gin.Context) {
	if err := authenticateAdminRequest(c); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{
			Error: fmt.Sprintf("authenticate error: %v", err),
		})
		return
	}

	// Parse interfaces coming from the frontend
	var corporateData types.Corporate
	if err := c.ShouldBindJSON(&corporateData); err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{
			Error: fmt.Sprintf("invalid request body: %v", err),
		})
		return
	}

	// invoke CreateCorporate
	if err := dao.DBClient.CreateCorporate(corporateData); err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{
			Error: fmt.Sprintf("failed to create corporate: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// AdminManageSubscriptionPlan manages WorkspaceSubscriptionPlan with prices
type SubscriptionPlanManageRequest struct {
	Plan    types.WorkspaceSubscriptionPlan `json:"plan"`
	Prices  []types.ProductPrice            `json:"prices"`
}

// AdminManageSubscriptionPlan Create or update WorkspaceSubscriptionPlan with prices
// @Summary Create or update WorkspaceSubscriptionPlan with prices
// @Description Create a new WorkspaceSubscriptionPlan with prices or update existing one with prices. Manages plan and prices as a single unit.
// @Tags Admin
// @Accept json
// @Produce json
// @Param request body SubscriptionPlanManageRequest true "Subscription plan with prices data"
// @Success 200 {object} map[string]interface{} "successfully created/updated subscription plan with prices"
// @Failure 400 {object} helper.ErrorMessage "invalid request body"
// @Failure 401 {object} helper.ErrorMessage "authenticate error"
// @Failure 500 {object} helper.ErrorMessage "failed to create/update subscription plan with prices"
// @Router /admin/v1alpha1/subscription-plan/manage [post]
func AdminManageSubscriptionPlan(c *gin.Context) {
	err := authenticateAdminRequest(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{
			Error: fmt.Sprintf("authenticate error: %v", err),
		})
		return
	}

	var request SubscriptionPlanManageRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{
			Error: fmt.Sprintf("invalid request body: %v", err),
		})
		return
	}

	plan := request.Plan
	prices := request.Prices

	// Debug logging
	logrus.Infof("AdminManageSubscriptionPlan: plan.Name=%s, plan.AIQuota=%d, plan.MaxResources=%s, plan.MaxSeats=%d",
		plan.Name, plan.AIQuota, plan.MaxResources, plan.MaxSeats)
	for i, price := range prices {
		logrus.Infof("AdminManageSubscriptionPlan: price[%d].BillingCycle=%s, price[%d].Price=%d",
			i, price.BillingCycle, i, price.Price)
	}

	var isCreate bool
	err = dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
		var existingPlan types.WorkspaceSubscriptionPlan
		var err error

		// If ID is provided, try to find by ID first
		if plan.ID != uuid.Nil {
			err = tx.Where("id = ?", plan.ID).First(&existingPlan).Error
			if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("failed to check existing plan by ID: %w", err)
			}
		}

		// If not found by ID, try to find by name
		if errors.Is(err, gorm.ErrRecordNotFound) && plan.Name != "" {
			err = tx.Where("name = ?", plan.Name).First(&existingPlan).Error
			if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("failed to check existing plan by name: %w", err)
			}
		}

		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Create new plan
			isCreate = true
			if plan.ID == uuid.Nil {
				plan.ID = uuid.New()
			}
			if err := tx.Create(&plan).Error; err != nil {
				return fmt.Errorf("failed to create subscription plan: %w", err)
			}
		} else {
			// Update existing plan - merge with existing data
			isCreate = false
			plan.ID = existingPlan.ID

			logrus.Infof("Updating existing plan: ID=%s, CurrentName='%s', RequestedName='%s'",
				existingPlan.ID, existingPlan.Name, plan.Name)

			// Handle name updates - allow setting name if current name is empty
			if plan.Name != "" && plan.Name != existingPlan.Name {
				// Allow setting name if current name is empty (data fix scenario)
				if existingPlan.Name == "" {
					logrus.Infof("Setting empty plan name to: %s", plan.Name)
					existingPlan.Name = plan.Name
				} else {
					return fmt.Errorf("cannot change plan name during update. Current name: %s, Requested name: %s", existingPlan.Name, plan.Name)
				}
			}

			// Keep the original name if not provided in update
			if plan.Name == "" {
				plan.Name = existingPlan.Name
			}

			// Update other fields
			existingPlan.Description = plan.Description
			existingPlan.UpgradePlanList = plan.UpgradePlanList
			existingPlan.DowngradePlanList = plan.DowngradePlanList
			existingPlan.MaxSeats = plan.MaxSeats
			existingPlan.MaxResources = plan.MaxResources
			existingPlan.Traffic = plan.Traffic
			existingPlan.AIQuota = plan.AIQuota
			existingPlan.Order = plan.Order
			existingPlan.Tags = plan.Tags

			if err := tx.Save(&existingPlan).Error; err != nil {
				return fmt.Errorf("failed to update subscription plan: %w", err)
			}

			// Delete existing prices for this plan
			if err := tx.Where("product_id = ?", plan.ID).Delete(&types.ProductPrice{}).Error; err != nil {
				return fmt.Errorf("failed to delete existing prices: %w", err)
			}
		}

		// Create new prices
		for i := range prices {
			prices[i].ProductID = plan.ID
			prices[i].ID = uuid.New() // Always create new price IDs
			if err := tx.Create(&prices[i]).Error; err != nil {
				return fmt.Errorf("failed to create product price for billing cycle %s: %w", prices[i].BillingCycle, err)
			}
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{
			Error: fmt.Sprintf("failed to create/update subscription plan with prices: %v", err),
		})
		return
	}

	operation := "updated"
	if isCreate {
		operation = "created"
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"plan_id":      plan.ID,
		"prices_count": len(prices),
		"operation":    operation,
	})
}

// AdminDeleteSubscriptionPlan Delete WorkspaceSubscriptionPlan
// @Summary Delete WorkspaceSubscriptionPlan
// @Description Delete a WorkspaceSubscriptionPlan by ID or name
// @Tags Admin
// @Accept json
// @Produce json
// @Param request body map[string]interface{} true "Delete request (id or name required)"
// @Success 200 {object} map[string]interface{} "successfully deleted subscription plan"
// @Failure 400 {object} helper.ErrorMessage "invalid request body"
// @Failure 401 {object} helper.ErrorMessage "authenticate error"
// @Failure 404 {object} helper.ErrorMessage "subscription plan not found"
// @Failure 500 {object} helper.ErrorMessage "failed to delete subscription plan"
// @Router /admin/v1alpha1/subscription-plan/delete [post]
func AdminDeleteSubscriptionPlan(c *gin.Context) {
	err := authenticateAdminRequest(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{
			Error: fmt.Sprintf("authenticate error: %v", err),
		})
		return
	}

	var request struct {
		ID   uuid.UUID `json:"id,omitempty"`
		Name string    `json:"name,omitempty"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{
			Error: fmt.Sprintf("invalid request body: %v", err),
		})
		return
	}

	if request.ID == uuid.Nil && request.Name == "" {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{
			Error: "either plan ID or name is required",
		})
		return
	}

	err = dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
		var plan types.WorkspaceSubscriptionPlan
		var err error

		if request.ID != uuid.Nil {
			err = tx.Where("id = ?", request.ID).First(&plan).Error
		} else {
			err = tx.Where("name = ?", request.Name).First(&plan).Error
		}

		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("subscription plan not found")
			}
			return fmt.Errorf("failed to get subscription plan: %w", err)
		}

		// Delete associated product prices first
		if err := tx.Where("product_id = ?", plan.ID).Delete(&types.ProductPrice{}).Error; err != nil {
			return fmt.Errorf("failed to delete associated product prices: %w", err)
		}

		// Delete the plan
		if err := tx.Delete(&plan).Error; err != nil {
			return fmt.Errorf("failed to delete subscription plan: %w", err)
		}

		return nil
	})

	if err != nil {
		if err.Error() == "subscription plan not found" {
			c.JSON(http.StatusNotFound, helper.ErrorMessage{Error: err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, helper.ErrorMessage{
				Error: fmt.Sprintf("failed to delete subscription plan: %v", err),
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

