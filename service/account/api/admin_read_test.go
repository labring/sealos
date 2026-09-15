package api

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestAdminReadPage(t *testing.T) {
	tests := []struct {
		name      string
		query     string
		pageIndex int
		pageSize  int
		wantErr   bool
	}{
		{name: "defaults", query: "/", pageIndex: 0, pageSize: 10},
		{name: "valid", query: "/?pageIndex=3&pageSize=25", pageIndex: 3, pageSize: 25},
		{name: "invalid page", query: "/?pageIndex=-1", wantErr: true},
		{name: "invalid size", query: "/?pageSize=101", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = httptest.NewRequestWithContext(context.Background(), "GET", tt.query, nil)
			pageIndex, pageSize, err := adminReadPage(c)
			if (err != nil) != tt.wantErr {
				t.Fatalf("adminReadPage() error = %v, wantErr %v", err, tt.wantErr)
			}
			if tt.wantErr {
				return
			}
			if pageIndex != tt.pageIndex ||
				pageSize != tt.pageSize {
				t.Fatalf(
					"adminReadPage() = %d, %d; want %d, %d",
					pageIndex,
					pageSize,
					tt.pageIndex,
					tt.pageSize,
				)
			}
		})
	}
}

func TestAdminReadTime(t *testing.T) {
	want := time.Date(2026, time.August, 13, 12, 0, 0, 0, time.UTC)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequestWithContext(
		context.Background(),
		"GET",
		"/?startTime="+want.Format(time.RFC3339),
		nil,
	)
	got, err := adminReadTime(c, "startTime")
	if err != nil {
		t.Fatalf("adminReadTime() error = %v", err)
	}
	if got == nil || !got.Equal(want) {
		t.Fatalf("adminReadTime() = %v, want %v", got, want)
	}

	invalidContext, _ := gin.CreateTestContext(httptest.NewRecorder())
	invalidContext.Request = httptest.NewRequestWithContext(
		context.Background(),
		"GET",
		"/?startTime=invalid",
		nil,
	)
	if _, err := adminReadTime(invalidContext, "startTime"); err == nil {
		t.Fatal("adminReadTime() expected invalid time error")
	}
}

func TestAdminReadFailureHidesInternalError(t *testing.T) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	adminReadFailure(c, errors.New("database schema details"))

	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf(
			"adminReadFailure() status = %d, want %d",
			recorder.Code,
			http.StatusInternalServerError,
		)
	}
	if strings.Contains(recorder.Body.String(), "database schema details") {
		t.Fatalf("adminReadFailure() exposed internal error: %s", recorder.Body.String())
	}
}

func TestAdminReadUnauthorizedHidesAuthenticationError(t *testing.T) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	adminReadUnauthorized(c, errors.New("invalid admin token: signing key details"))

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf(
			"adminReadUnauthorized() status = %d, want %d",
			recorder.Code,
			http.StatusUnauthorized,
		)
	}
	if strings.Contains(recorder.Body.String(), "signing key details") {
		t.Fatalf("adminReadUnauthorized() exposed authentication error: %s", recorder.Body.String())
	}
}
