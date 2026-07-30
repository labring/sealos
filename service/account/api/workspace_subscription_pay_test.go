package api

import (
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
	ctx.Request = httptest.NewRequest(
		"POST",
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
	}
	statusDescription, err := encodePendingWorkspaceSubscriptionRequestIdentity(brainReq, true)
	if err != nil {
		t.Fatalf("encode request identity: %v", err)
	}
	lastTransaction.StatusDesc = statusDescription

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
	lastTransaction.StatusDesc = "Promotion code: SAVE20"
	if !samePendingWorkspaceSubscriptionRequest(lastTransaction, &omittedReq) {
		t.Fatal("expected an omitted payApp to match a legacy pending request")
	}
}

func TestEncodePendingWorkspaceSubscriptionRequestIdentityPreservesLegacyOmission(t *testing.T) {
	req := &helper.WorkspaceSubscriptionOperatorReq{
		PromotionCode: "SAVE20",
	}

	statusDescription, err := encodePendingWorkspaceSubscriptionRequestIdentity(req, false)
	if err != nil {
		t.Fatalf("encode request identity: %v", err)
	}
	if statusDescription != "" {
		t.Fatalf("status description = %q, want legacy empty value", statusDescription)
	}

	statusDescription, err = encodePendingWorkspaceSubscriptionRequestIdentity(req, true)
	if err != nil {
		t.Fatalf("encode upgrade request identity: %v", err)
	}
	if statusDescription != "Promotion code: SAVE20" {
		t.Fatalf("status description = %q, want legacy promotion value", statusDescription)
	}
}
