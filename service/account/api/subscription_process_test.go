package api_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/api"
	"github.com/labring/sealos/service/account/dao"
)

type MockDB struct {
	mock.Mock
}

func (m *MockDB) Transaction(fc func(tx *gorm.DB) error) error {
	args := m.Called(fc)
	return args.Error(0)
}

func (m *MockDB) Exec(query string, values ...interface{}) *gorm.DB {
	args := m.Called(query, values)
	return args.Get(0).(*gorm.DB)
}

func (m *MockDB) Raw(query string, values ...interface{}) *gorm.DB {
	args := m.Called(query, values)
	return args.Get(0).(*gorm.DB)
}

func (m *MockDB) Model(value interface{}) *gorm.DB {
	args := m.Called(value)
	return args.Get(0).(*gorm.DB)
}

func TestSubscriptionProcessor_ProcessExpiredSubscriptions(t *testing.T) {
	mockDB := &MockDB{}
	processor := api.NewSubscriptionProcessor(mockDB)

	expiredSub := types.Subscription{
		ID:       uuid.New(),
		UserUID:  "test-user",
		PlanName: types.FreeSubscriptionPlanName,
		Status:   types.SubscriptionStatusNormal,
		ExpireAt: time.Now().Add(-1 * time.Hour),
	}

	mockDB.On("Transaction", mock.Anything).Return(nil)
	mockDB.On("Raw", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(&gorm.DB{})
	mockDB.On("Model", mock.Anything).Return(&gorm.DB{})

	err := processor.ProcessExpiredSubscriptions()
	assert.NoError(t, err)

	mockDB.AssertExpectations(t)
}

func TestSubscriptionProcessor_StartProcessing(t *testing.T) {
	mockDB := &MockDB{}
	processor := api.NewSubscriptionProcessor(mockDB)

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	mockDB.On("Transaction", mock.Anything).Return(nil)
	mockDB.On("Raw", mock.Anything, mock.Anything).Return(&gorm.DB{})
	mockDB.On("Model", mock.Anything).Return(&gorm.DB{})

	processor.StartProcessing(ctx)
}

func TestSubscriptionProcessor_HandlerSubscriptionTransaction(t *testing.T) {
	mockDB := &MockDB{}
	processor := api.NewSubscriptionProcessor(mockDB)

	sub := &types.Subscription{
		ID:       uuid.New(),
		UserUID:  "test-user",
		PlanName: types.FreeSubscriptionPlanName,
		Status:   types.SubscriptionStatusNormal,
	}

	mockDB.On("Transaction", mock.Anything).Return(nil)
	mockDB.On("Model", mock.Anything).Return(&gorm.DB{})

	// Mock dao.DBClient
	origDBClient := dao.DBClient
	defer func() { dao.DBClient = origDBClient }()

	mockDBClient := &dao.Client{}
	dao.DBClient = mockDBClient

	err := processor.HandlerSubscriptionTransaction(sub)
	assert.NoError(t, err)

	mockDB.AssertExpectations(t)
}

func TestInitSubscriptionProcessorTables(t *testing.T) {
	mockDB := &MockDB{}

	mockDB.On("Exec", mock.Anything).Return(&gorm.DB{Error: nil})

	err := api.InitSubscriptionProcessorTables(mockDB)
	assert.NoError(t, err)

	mockDB.AssertExpectations(t)
}
