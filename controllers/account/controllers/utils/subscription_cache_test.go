package utils

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"
)

type MockDB struct {
	mock.Mock
}

func (m *MockDB) WithContext(ctx context.Context) *gorm.DB {
	args := m.Called(ctx)
	return args.Get(0).(*gorm.DB)
}

func (m *MockDB) Select(query interface{}, args ...interface{}) *gorm.DB {
	callArgs := []interface{}{query}
	callArgs = append(callArgs, args...)
	mockArgs := m.Called(callArgs...)
	return mockArgs.Get(0).(*gorm.DB)
}

func (m *MockDB) Find(dest interface{}) error {
	args := m.Called(dest)
	return args.Error(0)
}

func (m *MockDB) Where(query interface{}, args ...interface{}) *gorm.DB {
	callArgs := []interface{}{query}
	callArgs = append(callArgs, args...)
	mockArgs := m.Called(callArgs...)
	return mockArgs.Get(0).(*gorm.DB)
}

func TestNewSubscriptionCache(t *testing.T) {
	mockDB := &MockDB{}
	mockDB.On("WithContext", mock.Anything).Return(mockDB)
	mockDB.On("Select", "user_uid", "status", "plan_name").Return(mockDB)
	mockDB.On("Find", mock.AnythingOfType("*[]types.Subscription")).Return(nil)

	cache, err := NewSubscriptionCache(mockDB, time.Minute)
	assert.NoError(t, err)
	assert.NotNil(t, cache)
	assert.NotNil(t, cache.updateTicker)

	cache.Close()
}

func TestGetEntry(t *testing.T) {
	mockDB := &MockDB{}
	mockDB.On("WithContext", mock.Anything).Return(mockDB)
	mockDB.On("Select", "user_uid", "status", "plan_name").Return(mockDB)
	mockDB.On("Find", mock.AnythingOfType("*[]types.Subscription")).Return(nil)

	cache, _ := NewSubscriptionCache(mockDB, time.Minute)
	defer cache.Close()

	userUID := uuid.New()
	cache.cache[userUID] = CacheEntry{
		UserUID:  userUID,
		Status:   types.SubscriptionStatusActive,
		PlanName: "test-plan",
	}

	entry, exists := cache.GetEntry(userUID)
	assert.True(t, exists)
	assert.Equal(t, userUID, entry.UserUID)
	assert.Equal(t, types.SubscriptionStatusActive, entry.Status)
	assert.Equal(t, "test-plan", entry.PlanName)

	_, exists = cache.GetEntry(uuid.New())
	assert.False(t, exists)
}

func TestGetAllEntries(t *testing.T) {
	mockDB := &MockDB{}
	mockDB.On("WithContext", mock.Anything).Return(mockDB)
	mockDB.On("Select", "user_uid", "status", "plan_name").Return(mockDB)
	mockDB.On("Find", mock.AnythingOfType("*[]types.Subscription")).Return(nil)

	cache, _ := NewSubscriptionCache(mockDB, time.Minute)
	defer cache.Close()

	uid1 := uuid.New()
	uid2 := uuid.New()

	cache.cache[uid1] = CacheEntry{UserUID: uid1, Status: types.SubscriptionStatusActive, PlanName: "plan1"}
	cache.cache[uid2] = CacheEntry{UserUID: uid2, Status: types.SubscriptionStatusInactive, PlanName: "plan2"}

	entries := cache.GetAllEntries()
	assert.Equal(t, 2, len(entries))

	entryMap := make(map[uuid.UUID]CacheEntry)
	for _, entry := range entries {
		entryMap[entry.UserUID] = entry
	}

	assert.Equal(t, types.SubscriptionStatusActive, entryMap[uid1].Status)
	assert.Equal(t, "plan1", entryMap[uid1].PlanName)
	assert.Equal(t, types.SubscriptionStatusInactive, entryMap[uid2].Status)
	assert.Equal(t, "plan2", entryMap[uid2].PlanName)
}

func TestUpdateCacheSinceLast(t *testing.T) {
	mockDB := &MockDB{}
	mockDB.On("WithContext", mock.Anything).Return(mockDB)
	mockDB.On("Select", "user_uid", "status", "plan_name").Return(mockDB)
	mockDB.On("Find", mock.AnythingOfType("*[]types.Subscription")).Return(nil)
	mockDB.On("Where", mock.Anything, mock.Anything, mock.Anything).Return(mockDB)

	cache, _ := NewSubscriptionCache(mockDB, time.Minute)
	defer cache.Close()

	err := cache.updateCacheSinceLast(context.Background())
	assert.NoError(t, err)
}

func TestLoadFullCache(t *testing.T) {
	mockDB := &MockDB{}
	mockDB.On("WithContext", mock.Anything).Return(mockDB)
	mockDB.On("Select", "user_uid", "status", "plan_name").Return(mockDB)

	testSubscriptions := []types.Subscription{
		{
			UserUID:  uuid.New(),
			Status:   types.SubscriptionStatusActive,
			PlanName: "plan1",
		},
		{
			UserUID:  uuid.New(),
			Status:   types.SubscriptionStatusInactive,
			PlanName: "plan2",
		},
	}

	mockDB.On("Find", mock.AnythingOfType("*[]types.Subscription")).Run(func(args mock.Arguments) {
		arg := args.Get(0).(*[]types.Subscription)
		*arg = testSubscriptions
	}).Return(nil)

	cache, _ := NewSubscriptionCache(mockDB, time.Minute)
	defer cache.Close()

	err := cache.loadFullCache(context.Background())
	assert.NoError(t, err)
	assert.Equal(t, len(testSubscriptions), len(cache.cache))
}
