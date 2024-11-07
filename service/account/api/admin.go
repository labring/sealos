package api

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/account/dao"
	"github.com/labring/sealos/service/account/helper"
)

// GetAccount
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

// ChargeBilling
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
	user, err := dao.JwtMgr.ParseUser(c)
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
