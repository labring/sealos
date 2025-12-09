package api

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/dao"
	"github.com/labring/sealos/service/account/helper"
	"github.com/sirupsen/logrus"
)

// @Success 200 {object} gin.H
// @Router /admin/v1alpha1/workspace-subscription/add [post]
func AdminAddWorkspaceSubscription(c *gin.Context) {
	req, err := authenticateAndParseAdminRequest(c)
	if err != nil {
		return
	}

	if err := setDefaultValues(c, req); err != nil {
		return
	}

	plan, price, err := validatePlanAndPrice(c, req)
	if err != nil {
		return
	}

	existingSubscription, err := validateExistingSubscription(c, req)
	if err != nil {
		return
	}

	if err := checkSubscriptionQuota(c, req); err != nil {
		return
	}

	// Process subscription transaction
	err = processSubscriptionTransaction(req, plan, price, existingSubscription)
	if err != nil {
		dao.Logger.Errorf("Failed to add workspace subscription via admin interface: %v", err)
		SetErrorResp(
			c,
			http.StatusInternalServerError,
			gin.H{"error": fmt.Sprintf("failed to add workspace subscription: %v", err)},
		)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf(
			"Workspace subscription '%s' added successfully for workspace '%s'",
			req.PlanName,
			req.Workspace,
		),
	})
}

// AdminWorkspaceSubscriptionList
// @Summary Admin get workspace subscription list
// @Description Admin interface to get paginated workspace subscription list with filtering options
// @Tags WorkspaceSubscription
// @Accept json
// @Produce json
// @Param req body AdminWorkspaceSubscriptionListReq true "AdminWorkspaceSubscriptionListReq"
// @Success 200 {object} AdminWorkspaceSubscriptionListResp
// @Router /admin/v1alpha1/workspace-subscription/list [post]
func AdminWorkspaceSubscriptionList(c *gin.Context) {
	// Authenticate admin request
	if err := authenticateAdminRequest(c); err != nil {
		SetErrorResp(
			c,
			http.StatusForbidden,
			gin.H{"error": fmt.Sprintf("admin authenticate error: %v", err)},
		)
		return
	}

	// Parse request
	req, err := helper.ParseAdminWorkspaceSubscriptionListReq(c)
	if err != nil {
		SetErrorResp(
			c,
			http.StatusBadRequest,
			gin.H{"error": fmt.Sprintf("failed to parse request: %v", err)},
		)
		return
	}

	logrus.Infof("Admin getting workspace subscription list: page=%d, size=%d, filters=%+v",
		req.PageIndex, req.PageSize, req)

	// Build query conditions
	conditions := map[string]any{}
	if req.Workspace != "" {
		conditions["workspace"] = req.Workspace
	}
	if req.UserUID != uuid.Nil {
		conditions["userUid"] = req.UserUID
	}
	if req.PlanName != "" {
		conditions["planName"] = req.PlanName
	}
	if req.Status != "" {
		conditions["status"] = req.Status
	}
	if req.RegionDomain != "" {
		conditions["regionDomain"] = req.RegionDomain
	}

	// Get subscriptions with pagination
	subscriptions, total, err := dao.DBClient.ListWorkspaceSubscriptionsWithPagination(
		conditions,
		req.PageIndex,
		req.PageSize,
	)
	if err != nil {
		SetErrorResp(
			c,
			http.StatusInternalServerError,
			gin.H{"error": fmt.Sprintf("failed to get workspace subscription list: %v", err)},
		)
		return
	}

	// Calculate pagination info
	totalPages := int(total) / req.PageSize
	if int(total)%req.PageSize > 0 {
		totalPages++
	}

	// Format response
	type SubscriptionInfo struct {
		ID                   uuid.UUID  `json:"id"`
		Workspace            string     `json:"workspace"`
		RegionDomain         string     `json:"regionDomain"`
		UserUID              uuid.UUID  `json:"userUID"`
		PlanName             string     `json:"planName"`
		Status               string     `json:"status"`
		PayStatus            string     `json:"payStatus"`
		PayMethod            string     `json:"payMethod"`
		CurrentPeriodStartAt time.Time  `json:"currentPeriodStartAt"`
		CurrentPeriodEndAt   time.Time  `json:"currentPeriodEndAt"`
		CreateAt             time.Time  `json:"createAt"`
		ExpireAt             *time.Time `json:"expireAt"`
	}

	subscriptionInfos := make([]SubscriptionInfo, len(subscriptions))
	for i, sub := range subscriptions {
		subscriptionInfos[i] = SubscriptionInfo{
			ID:                   sub.ID,
			Workspace:            sub.Workspace,
			RegionDomain:         sub.RegionDomain,
			UserUID:              sub.UserUID,
			PlanName:             sub.PlanName,
			Status:               string(sub.Status),
			PayStatus:            string(sub.PayStatus),
			PayMethod:            string(sub.PayMethod),
			CurrentPeriodStartAt: sub.CurrentPeriodStartAt,
			CurrentPeriodEndAt:   sub.CurrentPeriodEndAt,
			CreateAt:             sub.CreateAt,
			ExpireAt:             sub.ExpireAt,
		}
	}

	resp := gin.H{
		"subscriptions": subscriptionInfos,
		"pagination": gin.H{
			"pageIndex":    req.PageIndex,
			"pageSize":     req.PageSize,
			"totalRecords": total,
			"totalPages":   totalPages,
		},
	}

	c.JSON(http.StatusOK, resp)
}

// AdminSubscriptionPlans
// @Summary Admin get subscription plans
// @Description Admin interface to get all available subscription plans
// @Tags WorkspaceSubscription
// @Accept json
// @Produce json
// @Param req body AdminSubscriptionPlansReq true "AdminSubscriptionPlansReq"
// @Success 200 {object} AdminSubscriptionPlansResp
// @Router /admin/v1alpha1/subscription-plans [post]
func AdminSubscriptionPlans(c *gin.Context) {
	// Authenticate admin request
	if err := authenticateAdminRequest(c); err != nil {
		SetErrorResp(
			c,
			http.StatusForbidden,
			gin.H{"error": fmt.Sprintf("admin authenticate error: %v", err)},
		)
		return
	}

	// Parse request
	req, err := helper.ParseAdminSubscriptionPlansReq(c)
	if err != nil {
		SetErrorResp(
			c,
			http.StatusBadRequest,
			gin.H{"error": fmt.Sprintf("failed to parse request: %v", err)},
		)
		return
	}

	logrus.Infof("Admin getting subscription plans: includeInactive=%v, planType=%s",
		req.IncludeInactive, req.PlanType)

	// Get subscription plans
	plans, err := dao.DBClient.GetWorkspaceSubscriptionPlanList()
	if err != nil {
		SetErrorResp(
			c,
			http.StatusInternalServerError,
			gin.H{"error": fmt.Sprintf("failed to get subscription plans: %v", err)},
		)
		return
	}

	// Filter plans based on request parameters
	filteredPlans := []types.WorkspaceSubscriptionPlan{}
	for _, plan := range plans {
		// Filter by plan type if specified (check tags for type classification)
		if req.PlanType != "" {
			hasType := false
			for _, tag := range plan.Tags {
				if tag == req.PlanType {
					hasType = true
					break
				}
			}
			if !hasType {
				continue
			}
		}

		// For now, include all plans since there's no explicit status field
		// The includeInactive parameter can be used later if status tracking is added
		filteredPlans = append(filteredPlans, plan)
	}

	// Format response with pricing information
	type PlanPriceInfo struct {
		BillingCycle string `json:"billingCycle"`
		Price        int64  `json:"price"`
		Currency     string `json:"currency"`
	}

	type PlanInfo struct {
		ID           string          `json:"id"`
		Name         string          `json:"name"`
		Description  string          `json:"description"`
		Order        int             `json:"order"`
		Tags         []string        `json:"tags"`
		Prices       []PlanPriceInfo `json:"prices"`
		Traffic      int64           `json:"traffic"`
		AIQuota      int64           `json:"aiQuota"`
		MaxResources string          `json:"maxResources"`
		MaxSeats     int             `json:"maxSeats"`
	}

	planInfos := make([]PlanInfo, len(filteredPlans))
	for i, plan := range filteredPlans {
		prices := make([]PlanPriceInfo, len(plan.Prices))
		for j, price := range plan.Prices {
			prices[j] = PlanPriceInfo{
				BillingCycle: string(price.BillingCycle),
				Price:        price.Price,
				Currency:     "USD", // Default currency
			}
		}

		planInfos[i] = PlanInfo{
			ID:           plan.ID.String(),
			Name:         plan.Name,
			Description:  plan.Description,
			Order:        plan.Order,
			Tags:         plan.Tags,
			Prices:       prices,
			Traffic:      plan.Traffic,
			AIQuota:      plan.AIQuota,
			MaxResources: plan.MaxResources,
			MaxSeats:     plan.MaxSeats,
		}
	}

	resp := gin.H{
		"plans": planInfos,
		"total": len(planInfos),
	}

	c.JSON(http.StatusOK, resp)
}

// AdminWorkspaceSubscriptionListGET
// @Summary Admin get workspace subscription list (GET)
// @Description Admin interface to get paginated workspace subscription list with filtering options using GET method
// @Tags WorkspaceSubscription
// @Accept json
// @Produce json
// @Param pageIndex query int false "Page index (0-based)" example(0)
// @Param pageSize query int false "Page size (optional, defaults to 10)" example(10)
// @Param workspace query string false "Filter by workspace name" example("ns-8gmgq0jn")
// @Param userUID query string false "Filter by user ID" example("36ca5ee6-7b6e-4c15-922b-e861b3fbc061")
// @Param planName query string false "Filter by plan name" example("Hobby")
// @Param status query string false "Filter by subscription status" example("NORMAL")
// @Param regionDomain query string false "Filter by region domain" example("192.168.10.35.nip.io")
// @Success 200 {object} AdminWorkspaceSubscriptionListResp
// @Router /admin/v1alpha1/workspace-subscription/list [get]
func AdminWorkspaceSubscriptionListGET(c *gin.Context) {
	// Authenticate admin request
	if err := authenticateAdminRequest(c); err != nil {
		SetErrorResp(
			c,
			http.StatusForbidden,
			gin.H{"error": fmt.Sprintf("admin authenticate error: %v", err)},
		)
		return
	}

	// Parse query parameters
	req := &helper.AdminWorkspaceSubscriptionListReq{}

	// Parse pagination parameters
	if pageIndexStr := c.Query("pageIndex"); pageIndexStr != "" {
		if pageIndex, err := strconv.Atoi(pageIndexStr); err == nil {
			req.PageIndex = pageIndex
		}
	}
	if pageSizeStr := c.Query("pageSize"); pageSizeStr != "" {
		if pageSize, err := strconv.Atoi(pageSizeStr); err == nil {
			req.PageSize = pageSize
		}
	}

	// Parse filter parameters
	req.Workspace = c.Query("workspace")
	req.PlanName = c.Query("planName")
	req.Status = c.Query("status")
	req.RegionDomain = c.Query("regionDomain")

	// Parse userUID parameter
	if userUIDStr := c.Query("userUID"); userUIDStr != "" {
		if userUID, err := uuid.Parse(userUIDStr); err == nil {
			req.UserUID = userUID
		}
	}

	// Set default values
	if req.PageIndex < 0 {
		req.PageIndex = 0
	}
	if req.PageSize <= 0 {
		req.PageSize = 10
	}
	if req.PageSize > 100 {
		req.PageSize = 100 // Limit max page size
	}

	logrus.Infof("Admin getting workspace subscription list (GET): page=%d, size=%d, filters=%+v",
		req.PageIndex, req.PageSize, req)

	// Build query conditions
	conditions := map[string]any{}
	if req.Workspace != "" {
		conditions["workspace"] = req.Workspace
	}
	if req.UserUID != uuid.Nil {
		conditions["userUid"] = req.UserUID
	}
	if req.PlanName != "" {
		conditions["planName"] = req.PlanName
	}
	if req.Status != "" {
		conditions["status"] = req.Status
	}
	if req.RegionDomain != "" {
		conditions["regionDomain"] = req.RegionDomain
	}

	// Get subscriptions with pagination
	subscriptions, total, err := dao.DBClient.ListWorkspaceSubscriptionsWithPagination(
		conditions,
		req.PageIndex,
		req.PageSize,
	)
	if err != nil {
		SetErrorResp(
			c,
			http.StatusInternalServerError,
			gin.H{"error": fmt.Sprintf("failed to get workspace subscription list: %v", err)},
		)
		return
	}

	// Calculate pagination info
	totalPages := int(total) / req.PageSize
	if int(total)%req.PageSize > 0 {
		totalPages++
	}

	// Format response
	type SubscriptionInfo struct {
		ID                   uuid.UUID  `json:"id"`
		Workspace            string     `json:"workspace"`
		RegionDomain         string     `json:"regionDomain"`
		UserUID              uuid.UUID  `json:"userUID"`
		PlanName             string     `json:"planName"`
		Status               string     `json:"status"`
		PayStatus            string     `json:"payStatus"`
		PayMethod            string     `json:"payMethod"`
		CurrentPeriodStartAt time.Time  `json:"currentPeriodStartAt"`
		CurrentPeriodEndAt   time.Time  `json:"currentPeriodEndAt"`
		CreateAt             time.Time  `json:"createAt"`
		ExpireAt             *time.Time `json:"expireAt"`
	}

	subscriptionInfos := make([]SubscriptionInfo, len(subscriptions))
	for i, sub := range subscriptions {
		subscriptionInfos[i] = SubscriptionInfo{
			ID:                   sub.ID,
			Workspace:            sub.Workspace,
			RegionDomain:         sub.RegionDomain,
			UserUID:              sub.UserUID,
			PlanName:             sub.PlanName,
			Status:               string(sub.Status),
			PayStatus:            string(sub.PayStatus),
			PayMethod:            string(sub.PayMethod),
			CurrentPeriodStartAt: sub.CurrentPeriodStartAt,
			CurrentPeriodEndAt:   sub.CurrentPeriodEndAt,
			CreateAt:             sub.CreateAt,
			ExpireAt:             sub.ExpireAt,
		}
	}

	resp := gin.H{
		"subscriptions": subscriptionInfos,
		"pagination": gin.H{
			"pageIndex":    req.PageIndex,
			"pageSize":     req.PageSize,
			"totalRecords": total,
			"totalPages":   totalPages,
		},
	}

	c.JSON(http.StatusOK, resp)
}

// AdminSubscriptionPlansGET
// @Summary Admin get subscription plans (GET)
// @Description Admin interface to get all available subscription plans using GET method
// @Tags WorkspaceSubscription
// @Accept json
// @Produce json
// @Param includeInactive query bool false "Include inactive plans" example(false)
// @Param planType query string false "Filter by plan type" example("workspace")
// @Success 200 {object} AdminSubscriptionPlansResp
// @Router /admin/v1alpha1/subscription-plans [get]
func AdminSubscriptionPlansGET(c *gin.Context) {
	// Authenticate admin request
	if err := authenticateAdminRequest(c); err != nil {
		SetErrorResp(
			c,
			http.StatusForbidden,
			gin.H{"error": fmt.Sprintf("admin authenticate error: %v", err)},
		)
		return
	}

	// Parse query parameters
	req := &helper.AdminSubscriptionPlansReq{}

	if includeInactiveStr := c.Query("includeInactive"); includeInactiveStr != "" {
		if includeInactive, err := strconv.ParseBool(includeInactiveStr); err == nil {
			req.IncludeInactive = includeInactive
		}
	}

	req.PlanType = c.Query("planType")

	logrus.Infof("Admin getting subscription plans (GET): includeInactive=%v, planType=%s",
		req.IncludeInactive, req.PlanType)

	// Get subscription plans
	plans, err := dao.DBClient.GetWorkspaceSubscriptionPlanList()
	if err != nil {
		SetErrorResp(
			c,
			http.StatusInternalServerError,
			gin.H{"error": fmt.Sprintf("failed to get subscription plans: %v", err)},
		)
		return
	}

	// Filter plans based on request parameters
	filteredPlans := []types.WorkspaceSubscriptionPlan{}
	for _, plan := range plans {
		// Filter by plan type if specified (check tags for type classification)
		if req.PlanType != "" {
			hasType := false
			for _, tag := range plan.Tags {
				if tag == req.PlanType {
					hasType = true
					break
				}
			}
			if !hasType {
				continue
			}
		}

		// For now, include all plans since there's no explicit status field
		// The includeInactive parameter can be used later if status tracking is added
		filteredPlans = append(filteredPlans, plan)
	}

	// Format response with pricing information
	type PlanPriceInfo struct {
		BillingCycle string `json:"billingCycle"`
		Price        int64  `json:"price"`
		Currency     string `json:"currency"`
	}

	type PlanInfo struct {
		ID           string          `json:"id"`
		Name         string          `json:"name"`
		Description  string          `json:"description"`
		Order        int             `json:"order"`
		Tags         []string        `json:"tags"`
		Prices       []PlanPriceInfo `json:"prices"`
		Traffic      int64           `json:"traffic"`
		AIQuota      int64           `json:"aiQuota"`
		MaxResources string          `json:"maxResources"`
		MaxSeats     int             `json:"maxSeats"`
	}

	planInfos := make([]PlanInfo, len(filteredPlans))
	for i, plan := range filteredPlans {
		prices := make([]PlanPriceInfo, len(plan.Prices))
		for j, price := range plan.Prices {
			prices[j] = PlanPriceInfo{
				BillingCycle: string(price.BillingCycle),
				Price:        price.Price,
				Currency:     "USD", // Default currency
			}
		}

		planInfos[i] = PlanInfo{
			ID:           plan.ID.String(),
			Name:         plan.Name,
			Description:  plan.Description,
			Order:        plan.Order,
			Tags:         plan.Tags,
			Prices:       prices,
			Traffic:      plan.Traffic,
			AIQuota:      plan.AIQuota,
			MaxResources: plan.MaxResources,
			MaxSeats:     plan.MaxSeats,
		}
	}

	resp := gin.H{
		"plans": planInfos,
		"total": len(planInfos),
	}

	c.JSON(http.StatusOK, resp)
}
