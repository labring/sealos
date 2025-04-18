package api

import (
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/dao"
	"github.com/labring/sealos/service/account/helper"
)

// @Summary Get credits info
// @Description Get credits info
// @Tags Credits
// @Accept json
// @Produce json
// @Param req body CreditsInfoReq true "CreditsInfoReq"
// @Success 200 {object} CreditsInfoResp
// @Router /account/v1alpha1/credits/info [post]
func GetCreditsInfo(c *gin.Context) {
	req := &helper.AuthBase{}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	type CreditsInfoReq struct {
		UserUID          uuid.UUID `json:"userUid"`
		Balance          int64     `json:"balance"`
		DeductionBalance int64     `json:"deductionBalance"`
		Credits          int64     `json:"credits"`
		DeductionCredits int64     `json:"deductionCredits"`

		KYCDeductionCreditsDeductionBalance int64 `json:"kycDeductionCreditsDeductionBalance"`
		KYCDeductionCreditsBalance          int64 `json:"kycDeductionCreditsBalance"`
		CurrentPlanCreditsBalance           int64 `json:"currentPlanCreditsBalance"`
		CurrentPlanCreditsDeductionBalance  int64 `json:"currentPlanCreditsDeductionBalance"`
	}
	var creditsInfo CreditsInfoReq
	subscription, err := dao.DBClient.GetSubscription(&types.UserQueryOpts{UID: req.UserUID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get subscription info: %v", err)})
		return
	}
	currentPlan, err := dao.DBClient.GetSubscriptionPlan(subscription.PlanName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get subscription plan info: %v", err)})
		return
	}
	var currentCredits types.Credits
	err = dao.DBClient.GetGlobalDB().Model(&types.Credits{}).Where("expire_at > ? AND user_uid = ? AND from_id = ? AND status != ?", time.Now().UTC(), req.UserUID, currentPlan.ID, types.CreditsStatusExpired).Find(&currentCredits).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get credits list: %v", err)})
		return
	}
	creditsInfo.CurrentPlanCreditsBalance = currentCredits.Amount
	creditsInfo.CurrentPlanCreditsDeductionBalance = currentCredits.UsedAmount
	if subscription.PlanName != types.FreeSubscriptionPlanName {
		freePlan, err := dao.DBClient.GetSubscriptionPlan(types.FreeSubscriptionPlanName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get subscription plan info: %v", err)})
			return
		}
		var freeCredits types.Credits
		err = dao.DBClient.GetGlobalDB().Model(&types.Credits{}).Where("expire_at > ? AND user_uid = ? AND from_id = ? AND status != ?", time.Now().UTC(), req.UserUID, freePlan.ID, types.CreditsStatusExpired).Find(&freeCredits).Error
		if err != nil {
			c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get credits list: %v", err)})
			return
		}
		creditsInfo.KYCDeductionCreditsBalance = freeCredits.Amount
		creditsInfo.KYCDeductionCreditsDeductionBalance = freeCredits.UsedAmount
	} else {
		creditsInfo.KYCDeductionCreditsBalance = creditsInfo.CurrentPlanCreditsBalance
		creditsInfo.KYCDeductionCreditsDeductionBalance = creditsInfo.CurrentPlanCreditsDeductionBalance
	}

	creditss, err := dao.DBClient.GetBalanceWithCredits(&types.UserQueryOpts{UID: req.UserUID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get credits info: %v", err)})
		return
	}
	creditsInfo.UserUID = req.UserUID
	creditsInfo.Balance = creditss.Balance
	creditsInfo.DeductionBalance = creditss.DeductionBalance
	creditsInfo.Credits = creditss.Credits
	creditsInfo.DeductionCredits = creditss.DeductionCredits
	c.JSON(http.StatusOK, gin.H{
		"credits": creditsInfo,
	})
}
