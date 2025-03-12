package api

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/dao"
	"github.com/labring/sealos/service/account/helper"
)

// GetSubscriptionUserInfo
// @Summary Get user subscription info
// @Description Get user subscription info
// @Tags Subscription
// @Accept json
// @Produce json
// @Param req body SubscriptionUserInfoReq true "SubscriptionUserInfoReq"
// @Success 200 {object} SubscriptionUserInfoResp
// @Router /payment/v1alpha1/subscription/user-info [post]
func GetSubscriptionUserInfo(c *gin.Context) {
	req := &helper.AuthBase{}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	subscription, err := dao.DBClient.GetSubscription(&types.UserQueryOpts{UID: req.UserUID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get subscription info: %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"subscription": subscription,
	})
}

// GetSubscriptionPlanList
// @Summary Get subscription plan list
// @Description Get subscription plan list
// @Tags Subscription
// @Accept json
// @Produce json
// @Param req body SubscriptionPlanListReq true "SubscriptionPlanListReq"
// @Success 200 {object} SubscriptionPlanListResp
// @Router /payment/v1alpha1/subscription/plan-list [post]
func GetSubscriptionPlanList(c *gin.Context) {
	req := &helper.AuthBase{}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	plans, err := dao.DBClient.GetSubscriptionPlanList()
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get subscription plan list: %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"plans": plans,
	})
}
