package api_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/api"
	"github.com/labring/sealos/service/account/dao"
	"github.com/labring/sealos/service/account/helper"
	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestAdminFlushSubscriptionQuota(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		setupMocks     func()
		expectedStatus int
		expectedBody   interface{}
	}{
		{
			name: "successful quota update",
			setupMocks: func() {
				dao.K8sManager.Client = fake.NewClientBuilder().WithObjects(
					&corev1.Namespace{
						ObjectMeta: metav1.ObjectMeta{
							Name: "test-ns",
						},
					},
				).Build()

				dao.SubPlanResourceQuota = map[string]corev1.ResourceList{
					"basic": {
						corev1.ResourceCPU:    resource.MustParse("1"),
						corev1.ResourceMemory: resource.MustParse("1Gi"),
					},
				}
			},
			expectedStatus: http.StatusOK,
			expectedBody:   gin.H{"success": true},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupMocks()

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			c.Request = httptest.NewRequest(http.MethodPost, "/", nil)
			c.Request.Header.Set("Authorization", "Bearer test-token")

			api.AdminFlushSubscriptionQuota(c)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestUpdateNamespaceStatus(t *testing.T) {
	tests := []struct {
		name       string
		namespaces []string
		status     string
		setupMocks func() client.Client
		wantErr    bool
	}{
		{
			name:       "successful status update",
			namespaces: []string{"test-ns"},
			status:     api.SuspendDebtNamespaceAnnoStatus,
			setupMocks: func() client.Client {
				return fake.NewClientBuilder().WithObjects(
					&corev1.Namespace{
						ObjectMeta: metav1.ObjectMeta{
							Name:        "test-ns",
							Annotations: map[string]string{},
						},
					},
				).Build()
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := tt.setupMocks()
			err := api.UpdateNamespaceStatus(context.Background(), client, tt.status, tt.namespaces)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestSendDesktopNotice(t *testing.T) {
	tests := []struct {
		name       string
		req        *helper.AdminFlushDebtResourceStatusReq
		namespaces []string
		setupMocks func() client.Client
		wantErr    bool
	}{
		{
			name: "basic user no notice",
			req: &helper.AdminFlushDebtResourceStatusReq{
				IsBasicUser:       true,
				CurrentDebtStatus: types.NormalPeriod,
			},
			namespaces: []string{"test-ns"},
			setupMocks: func() client.Client {
				return fake.NewClientBuilder().Build()
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := tt.setupMocks()
			err := api.SendDesktopNotice(context.Background(), client, tt.req, tt.namespaces)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestFlushUserDebtResourceStatus(t *testing.T) {
	tests := []struct {
		name       string
		req        *helper.AdminFlushDebtResourceStatusReq
		namespaces []string
		setupMocks func() client.Client
		wantErr    bool
	}{
		{
			name: "normal to debt period",
			req: &helper.AdminFlushDebtResourceStatusReq{
				LastDebtStatus:    types.NormalPeriod,
				CurrentDebtStatus: types.DebtPeriod,
			},
			namespaces: []string{"test-ns"},
			setupMocks: func() client.Client {
				return fake.NewClientBuilder().WithObjects(
					&corev1.Namespace{
						ObjectMeta: metav1.ObjectMeta{
							Name:        "test-ns",
							Annotations: map[string]string{},
						},
					},
				).Build()
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := tt.setupMocks()
			err := api.FlushUserDebtResourceStatus(tt.req, client, tt.namespaces)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
