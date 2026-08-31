package api

import (
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/dao"
	"github.com/labring/sealos/service/account/helper"
	"github.com/sirupsen/logrus"
)

// @Summary Get credits info
// @Description Get credits info
// @Tags Credits
// @Accept json
// @Produce json
// @Param req body helper.AuthBase true "AuthBase"
// @Success 200 {object} CreditsInfoResp
// @Router /payment/v1alpha1/credits/info [post]
func GetCreditsInfo(c *gin.Context) {
	req := &helper.AuthBase{}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(
			http.StatusUnauthorized,
			helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)},
		)
		return
	}
	creditsInfo, err := getCreditsInfo(req.UserUID)
	if err != nil {
		logrus.Errorf("GetCreditsInfo error: %v", err)
		c.JSON(
			http.StatusInternalServerError,
			helper.ErrorMessage{Error: fmt.Sprintf("failed to get credits info: %v", err)},
		)
		return
	}
	c.JSON(http.StatusOK, CreditsInfoResp{Credits: creditsInfo})
}

type CreditsInfoResp struct {
	Credits CreditsInfo `json:"credits"`
}

type CreditsInfo struct {
	UserUID          uuid.UUID `json:"userUid"`
	Balance          int64     `json:"balance"`
	DeductionBalance int64     `json:"deductionBalance"`
	Credits          int64     `json:"credits"`
	DeductionCredits int64     `json:"deductionCredits"`

	KYCDeductionCreditsDeductionBalance int64 `json:"kycDeductionCreditsDeductionBalance"`
	KYCDeductionCreditsBalance          int64 `json:"kycDeductionCreditsBalance"`
	CurrentPlanCreditsBalance           int64 `json:"currentPlanCreditsBalance"`
	CurrentPlanCreditsDeductionBalance  int64 `json:"currentPlanCreditsDeductionBalance"`

	// CreditsList holds the same rows the aggregate fields above are summed
	// from, so sum(amount) == Credits and sum(usedAmount) == DeductionCredits;
	// exhausted rows stay in the list to keep that invariant. Callers filter
	// for display (e.g. amount > usedAmount).
	CreditsList []CreditsItem `json:"creditsList"`
}

type CreditsItem struct {
	Amount     int64               `json:"amount"`
	UsedAmount int64               `json:"usedAmount"`
	StartAt    *time.Time          `json:"startAt"`
	ExpireAt   *time.Time          `json:"expireAt"`
	Status     types.CreditsStatus `json:"status"`
}

func getCreditsInfo(userUID uuid.UUID) (CreditsInfo, error) {
	var (
		creditsInfo  CreditsInfo
		subscription *types.Subscription
		account      *types.Account
		err          error
		wg           sync.WaitGroup
		errChan      = make(chan error, 2)
	)
	wg.Add(1)
	go func() {
		defer wg.Done()
		// start := time.Now()
		subscription, err = dao.DBClient.GetSubscription(&types.UserQueryOpts{UID: userUID})
		// logrus.Printf("[DB] GetSubscription took %v", time.Since(start))
		if err != nil {
			errChan <- fmt.Errorf("failed to get subscription info: %w", err)
		}
	}()
	wg.Add(1)
	go func() {
		defer wg.Done()
		// start := time.Now()
		account, err = dao.DBClient.GetAccount(types.UserQueryOpts{UID: userUID})
		if err != nil {
			errChan <- fmt.Errorf("failed to get account: %w", err)
		}
		// logrus.Printf("[DB] GetAccount took %v", time.Since(start))
	}()

	wg.Wait()
	close(errChan)

	for e := range errChan {
		if e != nil {
			return CreditsInfo{}, e
		}
	}

	// start := time.Now()
	currentPlan, err := dao.DBClient.GetSubscriptionPlan(subscription.PlanName)
	// logrus.Printf("[DB] GetSubscriptionPlan (%s) took %v", subscription.PlanName, time.Since(start))
	if err != nil {
		return CreditsInfo{}, fmt.Errorf("failed to get subscription plan info: %w", err)
	}
	freePlan, err := dao.DBClient.GetSubscriptionPlan(types.FreeSubscriptionPlanName)
	if err != nil {
		return CreditsInfo{}, fmt.Errorf("failed to get free plan info: %w", err)
	}

	credits, err := dao.DBClient.GetAvailableCredits(&types.UserQueryOpts{UID: userUID})
	if err != nil {
		return CreditsInfo{}, fmt.Errorf("failed to get available credits: %w", err)
	}

	creditsInfo = buildCreditsInfo(
		credits,
		currentPlan.ID.String(),
		freePlan.ID.String(),
		subscription.PlanName,
	)
	creditsInfo.UserUID = userUID
	creditsInfo.Balance = account.Balance
	creditsInfo.DeductionBalance = account.DeductionBalance
	return creditsInfo, nil
}

func buildCreditsInfo(
	credits []types.Credits,
	currentPlanID, freePlanID, planName string,
) CreditsInfo {
	creditsInfo := CreditsInfo{CreditsList: make([]CreditsItem, 0, len(credits))}
	for i := range credits {
		switch credits[i].FromID {
		case currentPlanID:
			creditsInfo.CurrentPlanCreditsBalance = credits[i].Amount
			creditsInfo.CurrentPlanCreditsDeductionBalance = credits[i].UsedAmount
		case freePlanID:
			creditsInfo.KYCDeductionCreditsBalance = credits[i].Amount
			creditsInfo.KYCDeductionCreditsDeductionBalance = credits[i].UsedAmount
		}
	}
	if planName == types.FreeSubscriptionPlanName {
		creditsInfo.KYCDeductionCreditsBalance = creditsInfo.CurrentPlanCreditsBalance
		creditsInfo.KYCDeductionCreditsDeductionBalance = creditsInfo.CurrentPlanCreditsDeductionBalance
	}

	for _, c := range credits {
		creditsInfo.Credits += c.Amount
		creditsInfo.DeductionCredits += c.UsedAmount
		creditsInfo.CreditsList = append(creditsInfo.CreditsList, CreditsItem{
			Amount:     c.Amount,
			UsedAmount: c.UsedAmount,
			StartAt:    nonZeroTime(c.StartAt),
			ExpireAt:   nonZeroTime(c.ExpireAt),
			Status:     c.Status,
		})
	}
	return creditsInfo
}

func nonZeroTime(t time.Time) *time.Time {
	if t.IsZero() {
		return nil
	}
	return &t
}
