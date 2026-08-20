package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/helper"
)

func TestParseWorkspaceSubscriptionPayReqRejectsInvalidPayApp(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequestWithContext(
		context.Background(),
		http.MethodPost,
		"/workspace-subscription/pay",
		strings.NewReader(`{
			"regionDomain":"example.com",
			"planName":"pro",
			"payMethod":"stripe",
			"operator":"created",
			"payApp":"untrusted-app"
		}`),
	)
	ctx.Request.Header.Set("Content-Type", "application/json")

	if _, err := parseWorkspaceSubscriptionPayReq(ctx); err == nil {
		t.Fatal("expected an invalid payApp to be rejected by the pay endpoint")
	}
}

func TestSamePendingWorkspaceSubscriptionRequestIncludesPayApp(t *testing.T) {
	brainReq := &helper.WorkspaceSubscriptionOperatorReq{
		PlanName:      "pro",
		Operator:      types.SubscriptionTransactionTypeCreated,
		Period:        types.SubscriptionPeriodMonthly,
		PromotionCode: "SAVE20",
		PayApp:        types.PayAppBrain,
	}
	lastTransaction := &types.WorkspaceSubscriptionTransaction{
		NewPlanName: brainReq.PlanName,
		Operator:    brainReq.Operator,
		Period:      brainReq.Period,
		PayApp:      brainReq.PayApp,
		StatusDesc:  "Promotion code: SAVE20",
	}

	if !samePendingWorkspaceSubscriptionRequest(lastTransaction, brainReq) {
		t.Fatal("expected the same declared payApp to reuse the pending request")
	}

	costcenterReq := *brainReq
	costcenterReq.PayApp = types.PayAppCostcenter
	if samePendingWorkspaceSubscriptionRequest(lastTransaction, &costcenterReq) {
		t.Fatal("expected a different declared payApp not to reuse the pending request")
	}

	omittedReq := *brainReq
	omittedReq.PayApp = ""
	lastTransaction.PayApp = ""
	if !samePendingWorkspaceSubscriptionRequest(lastTransaction, &omittedReq) {
		t.Fatal("expected an omitted payApp to match a legacy pending request")
	}
}
