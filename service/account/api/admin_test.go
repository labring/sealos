package api_test

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/api"
	"github.com/labring/sealos/service/account/dao"
	"github.com/labring/sealos/service/account/helper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"
)

type mockDBClient struct {
	mock.Mock
}

func (m *mockDBClient) GetAccountWithWorkspace(workspace string) (*dao.Account, error) {
	args := m.Called(workspace)
	return args.Get(0).(*dao.Account), args.Error(1)
}

func (m *mockDBClient) ChargeBilling(req *helper.AdminChargeBillingReq) error {
	args := m.Called(req)
	return args.Error(0)
}

func (m *mockDBClient) GetUserID(opts types.UserQueryOpts) (string, error) {
	args := m.Called(opts)
	return args.String(0), args.Error(1)
}

func (m *mockDBClient) GetUserCrName(opts types.UserQueryOpts) (string, error) {
	args := m.Called(opts)
	return args.String(0), args.Error(1)
}

func TestAdminGetAccountWithWorkspaceID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		workspace      string
		setupAuth      func(*gin.Context)
		setupMockDB    func(*mockDBClient)
		expectedStatus int
		expectedBody   string
	}{
		{
			name:      "successful get account",
			workspace: "test-workspace",
			setupAuth: func(c *gin.Context) {
				c.Request.Header.Set("Authorization", "Bearer validtoken")
			},
			setupMockDB: func(m *mockDBClient) {
				m.On("GetAccountWithWorkspace", "test-workspace").Return(&dao.Account{
					UserUID:          uuid.New(),
					Balance:          100,
					DeductionBalance: 20,
				}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:      "missing workspace",
			workspace: "",
			setupAuth: func(c *gin.Context) {
				c.Request.Header.Set("Authorization", "Bearer validtoken")
			},
			setupMockDB:    func(m *mockDBClient) {},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockDB := new(mockDBClient)
			tt.setupMockDB(mockDB)
			dao.DBClient = mockDB

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			c.Request = httptest.NewRequest(http.MethodGet, "/admin/v1alpha1/account", nil)
			if tt.workspace != "" {
				c.Request.URL.RawQuery = fmt.Sprintf("namespace=%s", tt.workspace)
			}
			tt.setupAuth(c)

			api.AdminGetAccountWithWorkspaceID(c)

			assert.Equal(t, tt.expectedStatus, w.Code)
			mockDB.AssertExpectations(t)
		})
	}
}

func TestAdminUserTrafficOperator(t *testing.T) {
	gin.SetMode(gin.TestMode)

	validUUID := uuid.New()

	tests := []struct {
		name           string
		userUID        string
		setupAuth      func(*gin.Context)
		setupMockDB    func(*mockDBClient)
		expectedStatus int
	}{
		{
			name:    "successful suspend traffic",
			userUID: validUUID.String(),
			setupAuth: func(c *gin.Context) {
				c.Request.Header.Set("Authorization", "Bearer validtoken")
			},
			setupMockDB: func(m *mockDBClient) {
				m.On("GetUserCrName", types.UserQueryOpts{UID: validUUID}).Return("testuser", nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:    "invalid uuid",
			userUID: "invalid-uuid",
			setupAuth: func(c *gin.Context) {
				c.Request.Header.Set("Authorization", "Bearer validtoken")
			},
			setupMockDB:    func(m *mockDBClient) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:    "user not found",
			userUID: validUUID.String(),
			setupAuth: func(c *gin.Context) {
				c.Request.Header.Set("Authorization", "Bearer validtoken")
			},
			setupMockDB: func(m *mockDBClient) {
				m.On("GetUserCrName", types.UserQueryOpts{UID: validUUID}).Return("", gorm.ErrRecordNotFound)
			},
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockDB := new(mockDBClient)
			tt.setupMockDB(mockDB)
			dao.DBClient = mockDB

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			c.Request = httptest.NewRequest(http.MethodPost, "/admin/v1alpha1/suspend", nil)
			if tt.userUID != "" {
				c.Request.URL.RawQuery = fmt.Sprintf("userUID=%s", tt.userUID)
			}
			tt.setupAuth(c)

			api.AdminSuspendUserTraffic(c)

			assert.Equal(t, tt.expectedStatus, w.Code)
			mockDB.AssertExpectations(t)
		})
	}
}

func TestAuthenticateAdminRequest(t *testing.T) {
	tests := []struct {
		name          string
		setupAuth     func(*gin.Context)
		expectedError bool
	}{
		{
			name: "valid admin token",
			setupAuth: func(c *gin.Context) {
				c.Request.Header.Set("Authorization", "Bearer validAdminToken")
			},
			expectedError: false,
		},
		{
			name: "missing token",
			setupAuth: func(c *gin.Context) {
			},
			expectedError: true,
		},
		{
			name: "invalid token format",
			setupAuth: func(c *gin.Context) {
				c.Request.Header.Set("Authorization", "invalidtoken")
			},
			expectedError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodGet, "/", nil)
			tt.setupAuth(c)

			err := api.AuthenticateAdminRequest(c)
			if tt.expectedError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
