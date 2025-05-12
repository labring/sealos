package api_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/api"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	err = api.InitSubscriptionProcessorTables(db)
	require.NoError(t, err)

	return db
}

func TestNewSubscriptionProcessor(t *testing.T) {
	db := setupTestDB(t)
	processor := api.NewSubscriptionProcessor(db)
	assert.NotNil(t, processor)
}

func TestSubscriptionProcessor_ProcessKYCCredits(t *testing.T) {
	db := setupTestDB(t)
	processor := api.NewSubscriptionProcessor(db)

	// Create test user KYC records
	testUser := uuid.New()
	kyc := types.UserKYC{
		UserUID:   testUser,
		Status:    types.UserKYCStatusPending,
		NextAt:    time.Now().UTC().Add(-1 * time.Hour),
		CreatedAt: time.Now().UTC(),
	}

	err := db.Create(&kyc).Error
	require.NoError(t, err)

	// Test ProcessKYCCredits
	processor.ProcessKYCCredits()

	// Verify the results
	var updatedKYC types.UserKYC
	err = db.Where("user_uid = ?", testUser).First(&updatedKYC).Error
	require.NoError(t, err)
}

func TestSubscriptionProcessor_StartProcessing(t *testing.T) {
	db := setupTestDB(t)
	processor := api.NewSubscriptionProcessor(db)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	go processor.StartProcessing(ctx)

	// Wait for processing to start and complete one cycle
	time.Sleep(1 * time.Second)
}

func TestSubscriptionProcessor_StartKYCProcessing(t *testing.T) {
	db := setupTestDB(t)
	processor := api.NewSubscriptionProcessor(db)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	go processor.StartKYCProcessing(ctx)

	// Wait for processing to start and complete one cycle
	time.Sleep(1 * time.Second)
}

func TestHasGithubOauthProvider(t *testing.T) {
	db := setupTestDB(t)

	testUser := uuid.New()
	provider := types.OauthProvider{
		UID:          uuid.New(),
		UserUID:      testUser,
		ProviderType: types.OauthProviderTypeGithub,
		ProviderID:   "test-provider",
	}

	err := db.Create(&provider).Error
	require.NoError(t, err)

	// Test existing provider
	has, err := api.HasGithubOauthProvider(db, testUser)
	require.NoError(t, err)
	assert.True(t, has)

	// Test non-existing provider
	has, err = api.HasGithubOauthProvider(db, uuid.New())
	require.NoError(t, err)
	assert.False(t, has)
}

func TestGetGithubOauthProviderID(t *testing.T) {
	db := setupTestDB(t)

	testUser := uuid.New()
	provider := types.OauthProvider{
		UID:          uuid.New(),
		UserUID:      testUser,
		ProviderType: types.OauthProviderTypeGithub,
		ProviderID:   "test-provider-id",
	}

	err := db.Create(&provider).Error
	require.NoError(t, err)

	// Test existing provider
	providerID, err := api.GetGithubOauthProviderID(db, testUser)
	require.NoError(t, err)
	assert.Equal(t, "test-provider-id", providerID)

	// Test non-existing provider
	providerID, err = api.GetGithubOauthProviderID(db, uuid.New())
	require.NoError(t, err)
	assert.Empty(t, providerID)
}
