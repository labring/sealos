package helper

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestParseWorkspaceSubscriptionOperatorReqBindsPayApp(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, payApp := range []string{"system-costcenter", "system-brain"} {
		t.Run(payApp, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			ctx, _ := gin.CreateTestContext(recorder)
			ctx.Request = httptest.NewRequestWithContext(
				context.Background(),
				http.MethodPost,
				"/workspace-subscription/pay",
				strings.NewReader(fmt.Sprintf(`{
					"regionDomain":"example.com",
					"planName":"pro",
					"payMethod":"stripe",
					"operator":"created",
					"payApp":%q
				}`, payApp)),
			)
			ctx.Request.Header.Set("Content-Type", "application/json")

			req, err := ParseWorkspaceSubscriptionOperatorReq(ctx)
			if err != nil {
				t.Fatalf("expected payApp %q to be accepted: %v", payApp, err)
			}
			if string(req.PayApp) != payApp {
				t.Fatalf("payApp = %q, want %q", req.PayApp, payApp)
			}
		})
	}
}

func TestParseWorkspaceSubscriptionOperatorReqLeavesPayAppValidationToPayEndpoint(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequestWithContext(
		context.Background(),
		http.MethodPost,
		"/workspace-subscription/upgrade-amount",
		strings.NewReader(`{
			"regionDomain":"example.com",
			"planName":"pro",
			"payMethod":"stripe",
			"operator":"upgraded",
			"payApp":"ignored-by-preview"
		}`),
	)
	ctx.Request.Header.Set("Content-Type", "application/json")

	req, err := ParseWorkspaceSubscriptionOperatorReq(ctx)
	if err != nil {
		t.Fatalf("expected the shared parser not to validate payApp: %v", err)
	}
	if req.PayApp != "ignored-by-preview" {
		t.Fatalf("payApp = %q, want %q", req.PayApp, "ignored-by-preview")
	}
}
