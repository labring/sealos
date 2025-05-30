package api_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/api"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"
)

type MockDB struct {
	mock.Mock
}

func (m *MockDB) Exec(sql string, values ...interface{}) *gorm.DB {
	args := m.Called(sql, values)
	return args.Get(0).(*gorm.DB)
}

func (m *MockDB) Model(value interface{}) *gorm.DB {
	args := m.Called(value)
	return args.Get(0).(*gorm.DB)
}

func (m *MockDB) Where(query interface{}, args ...interface{}) *gorm.DB {
	mockArgs := m.Called(query, args)
	return mockArgs.Get(0).(*gorm.DB)
}

func (m *MockDB) Select(query interface{}, args ...interface{}) *gorm.DB {
	mockArgs := m.Called(query, args)
	return mockArgs.Get(0).(*gorm.DB)
}

func (m *MockDB) Scan(dest interface{}) *gorm.DB {
	args := m.Called(dest)
	return args.Get(0).(*gorm.DB)
}

func (m *MockDB) Update(column string, value interface{}) *gorm.DB {
	args := m.Called(column, value)
	return args.Get(0).(*gorm.DB)
}

func (m *MockDB) Raw(sql string, values ...interface{}) *gorm.DB {
	args := m.Called(sql, values)
	return args.Get(0).(*gorm.DB)
}

func (m *MockDB) Transaction(fc func(tx *gorm.DB) error) error {
	args := m.Called(fc)
	return args.Error(0)
}

func TestSubscriptionProcessor_StartProcessing(t *testing.T) {
	mockDB := &MockDB{}
	processor := api.NewSubscriptionProcessor(mockDB)

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	mockDB.On("Raw", mock.Anything, mock.Anything).Return(&gorm.DB{Error: nil})
	mockDB.On("Exec", mock.Anything, mock.Anything).Return(&gorm.DB{Error: nil})

	processor.StartProcessing(ctx)
}

func TestSubscriptionProcessor_ProcessExpiredSubscriptions(t *testing.T) {
	mockDB := &MockDB{}
	processor := api.NewSubscriptionProcessor(mockDB)

	expiredSub := types.Subscription{
		ID:       uuid.New(),
		UserUID:  uuid.New(),
		PlanName: "test-plan",
		Status:   types.SubscriptionStatusNormal,
	}

	mockDB.On("Transaction", mock.AnythingOfType("func(*gorm.DB) error")).Return(nil)
	mockDB.On("Raw", mock.Anything, mock.Anything).Return(&gorm.DB{Error: nil})
	mockDB.On("Model", mock.Anything).Return(mockDB)
	mockDB.On("Where", mock.Anything, mock.Anything).Return(mockDB)
	mockDB.On("Select", mock.Anything).Return(mockDB)
	mockDB.On("Scan", mock.Anything).Return(&gorm.DB{Error: nil})
	mockDB.On("Update", mock.Anything, mock.Anything).Return(&gorm.DB{Error: nil})

	err := processor.ProcessExpiredSubscriptions()
	assert.NoError(t, err)
}

func TestInitSubscriptionProcessorTables(t *testing.T) {
	mockDB := &MockDB{}
	mockDB.On("Exec", mock.Anything).Return(&gorm.DB{Error: nil})

	err := api.InitSubscriptionProcessorTables(mockDB)
	assert.NoError(t, err)
}

func TestSubscriptionProcessor_ProcessKYCCredits(t *testing.T) {
	mockDB := &MockDB{}
	processor := api.NewSubscriptionProcessor(mockDB)

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	mockDB.On("Raw", mock.Anything, mock.Anything).Return(&gorm.DB{Error: nil})
	mockDB.On("Transaction", mock.AnythingOfType("func(*gorm.DB) error")).Return(nil)

	go processor.StartKYCProcessing(ctx)
	time.Sleep(50 * time.Millisecond)
}
