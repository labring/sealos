package api

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/labring/sealos/controllers/pkg/pay"

	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/dao"
	"github.com/labring/sealos/service/account/helper"
	"gorm.io/gorm"
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
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	workspace, exist := c.GetQuery("namespace")
	if !exist || workspace == "" {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: "empty workspace"})
		return
	}
	account, err := dao.DBClient.GetAccountWithWorkspace(workspace)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get account : %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"userUID": account.UserUID,
		"balance": account.Balance - account.DeductionBalance,
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
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	billingReq, err := helper.ParseAdminChargeBillingReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: fmt.Sprintf("failed to parse request : %v", err)})
		return
	}
	helper.CallCounter.WithLabelValues("ChargeBilling", billingReq.UserUID.String()).Inc()
	err = dao.DBClient.ChargeBilling(billingReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to charge billing : %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "successfully charged billing",
	})
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
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	userUID, exist := c.GetQuery("userUID")
	if !exist || userUID == "" {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: "empty userUID"})
		return
	}
	userID, err := dao.DBClient.GetUserID(types.UserQueryOpts{UID: uuid.MustParse(userUID)})
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get user ID: %v", err)})
		return
	}
	ck := dao.DBClient.GetCockroach()

	userRealNameInfo, err := ck.GetUserRealNameInfoByUserID(userID)

	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get user real name info: %v", err)})
		return
	}

	enterpriseRealNameInfo, err := ck.GetEnterpriseRealNameInfoByUserID(userID)

	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get enterprise real name info: %v", err)})
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
//func AdminActiveBilling(c *gin.Context) {
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
		return fmt.Errorf("null auth found")
	}
	token := strings.TrimPrefix(tokenString, "Bearer ")
	user, err := dao.JwtMgr.ParseUser(token)
	if err != nil {
		return fmt.Errorf("failed to parse user: %v", err)
	}
	if user == nil {
		return fmt.Errorf("user not found")
	}
	if user.Requester != AdminUserName {
		return fmt.Errorf("user is not admin")
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
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	userUIDStr, exist := c.GetQuery("userUID")
	if !exist || userUIDStr == "" {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: "empty userUID"})
		return
	}
	userUID, err := uuid.Parse(userUIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: fmt.Sprintf("invalid userUID format: %v", err)})
		return
	}
	owner, err := dao.DBClient.GetUserCrName(types.UserQueryOpts{UID: userUID})
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get user cr name: %v", err)})
		return
	}
	if owner == "" {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}
	namespaces, err := getOwnNsListWithClt(dao.K8sManager.GetClient(), owner)
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("get own namespace list failed: %v", err)})
		return
	}
	if len(namespaces) == 0 {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}
	if err = updateNetworkNamespaceStatus(context.Background(), dao.K8sManager.GetClient(), networkStatus, namespaces); err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to flush user resource status: %v", err)})
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
			return fmt.Errorf("new payment handler failed: %v", err)
		}
		_, _, err = svc.RefundPayment(pay.RefundOption{
			TradeNo:  p.TradeNo,
			Amount:   p.RefundAmount,
			RefundID: p.RefundNo,
		})
		if err != nil {
			return fmt.Errorf("failed to refund payment: %v", err)
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
