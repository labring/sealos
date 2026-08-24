package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/helper"
)

func TestCanRecreateWorkspaceSubscription(t *testing.T) {
	tests := []struct {
		name   string
		status types.SubscriptionStatus
		want   bool
	}{
		{
			name:   "debt subscription",
			status: types.SubscriptionStatusDebt,
			want:   true,
		},
		{
			name:   "deleted subscription",
			status: types.SubscriptionStatusDeleted,
			want:   true,
		},
		{
			name:   "normal subscription",
			status: types.SubscriptionStatusNormal,
			want:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := canRecreateWorkspaceSubscription(tt.status); got != tt.want {
				t.Fatalf("canRecreateWorkspaceSubscription(%q) = %v, want %v", tt.status, got, tt.want)
			}
		})
	}
}

func TestDeletedWorkspaceSubscriptionIsExpired(t *testing.T) {
	now := time.Date(2026, time.August, 24, 0, 0, 0, 0, time.UTC)
	subscription := &types.WorkspaceSubscription{
		Status:             types.SubscriptionStatusDeleted,
		CurrentPeriodEndAt: now.Add(24 * time.Hour),
	}

	if !isWorkspaceSubscriptionExpired(subscription, now) {
		t.Fatal("expected a deleted subscription to be ineligible for resume")
	}
}

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
