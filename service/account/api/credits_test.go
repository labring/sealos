package api

import (
	"errors"
	"os"
	"reflect"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/dao"
)

// mockDBClient implements DBClientInterface for testing getCreditsInfo
type mockDBClient struct {
	getSubscriptionFunc      func(*types.UserQueryOpts) (*types.Subscription, error)
	getAccountFunc           func(types.UserQueryOpts) (*types.Account, error)
	getSubscriptionPlanFunc  func(string) (*types.SubscriptionPlan, error)
	getAvailableCreditsFunc  func(*types.UserQueryOpts) ([]types.Credits, error)
}

func (m *mockDBClient) GetSubscription(opts *types.UserQueryOpts) (*types.Subscription, error) {
	return m.getSubscriptionFunc(opts)
}
func (m *mockDBClient) GetAccount(opts types.UserQueryOpts) (*types.Account, error) {
	return m.getAccountFunc(opts)
}
func (m *mockDBClient) GetSubscriptionPlan(planName string) (*types.SubscriptionPlan, error) {
	return m.getSubscriptionPlanFunc(planName)
}
func (m *mockDBClient) GetAvailableCredits(opts *types.UserQueryOpts) ([]types.Credits, error) {
	return m.getAvailableCreditsFunc(opts)
}

// The following methods are not used in getCreditsInfo
func (m *mockDBClient) GetBalanceWithCredits(opts *types.UserQueryOpts) (*types.Account, error) {
	return nil, nil
}
func (m *mockDBClient) GetGlobalDB() any { return nil }
func (m *mockDBClient) CreateAccount(uid uuid.UUID) error { return nil }
func (m *mockDBClient) CreateCredits(credits *types.Credits) error { return nil }
func (m *mockDBClient) UpdateCredits(credits *types.Credits) error { return nil }
func (m *mockDBClient) UpdateAccount(account *types.Account) error { return nil }
func (m *mockDBClient) GetCredits(opts *types.UserQueryOpts) ([]types.Credits, error) { return nil, nil }
func (m *mockDBClient) GetCreditsByID(id string) (*types.Credits, error) { return nil, nil }
func (m *mockDBClient) GetAccountByID(id string) (*types.Account, error) { return nil, nil }
func (m *mockDBClient) GetSubscriptionByID(id string) (*types.Subscription, error) { return nil, nil }
func (m *mockDBClient) GetSubscriptionPlanByID(id string) (*types.SubscriptionPlan, error) { return nil, nil }
func (m *mockDBClient) CreateSubscription(sub *types.Subscription) error { return nil }
func (m *mockDBClient) UpdateSubscription(sub *types.Subscription) error { return nil }
func (m *mockDBClient) CreateSubscriptionPlan(plan *types.SubscriptionPlan) error { return nil }
func (m *mockDBClient) UpdateSubscriptionPlan(plan *types.SubscriptionPlan) error { return nil }
func (m *mockDBClient) Close() error { return nil }

func Test_getCreditsInfo_success(t *testing.T) {
	userUID := uuid.New()
	currentPlanID := uuid.New()
	freePlanID := uuid.New()

	// Provide both current plan and free plan
	db := &mockDBClient{
		getSubscriptionFunc: func(opts *types.UserQueryOpts) (*types.Subscription, error) {
			return &types.Subscription{
				UserUID:  userUID,
				PlanName: "pro",
			}, nil
		},
		getAccountFunc: func(opts types.UserQueryOpts) (*types.Account, error) {
			return &types.Account{
				UserUID:         userUID,
				Balance:         100,
				DeductionBalance: 10,
			}, nil
		},
		getSubscriptionPlanFunc: func(planName string) (*types.SubscriptionPlan, error) {
			if planName == "pro" {
				return &types.SubscriptionPlan{
					ID:   currentPlanID,
					Name: "pro",
				}, nil
			}
			if planName == types.FreeSubscriptionPlanName {
				return &types.SubscriptionPlan{
					ID:   freePlanID,
					Name: types.FreeSubscriptionPlanName,
				}, nil
			}
			return nil, errors.New("plan not found")
		},
		getAvailableCreditsFunc: func(opts *types.UserQueryOpts) ([]types.Credits, error) {
			return []types.Credits{
				{
					UserUID:   userUID,
					FromID:    currentPlanID.String(),
					Amount:    200,
					UsedAmount: 50,
				},
				{
					UserUID:   userUID,
					FromID:    freePlanID.String(),
					Amount:    30,
					UsedAmount: 5,
				},
			}, nil
		},
	}

	// Patch the global DBClient
	oldDBClient := dao.DBClient
	dao.DBClient = db
	defer func() { dao.DBClient = oldDBClient }()

	creditsInfoAny, err := getCreditsInfo(userUID)
	require.NoError(t, err)

	creditsInfo, ok := creditsInfoAny.(CreditsInfoReq)
	require.True(t, ok, "creditsInfo should be of type CreditsInfoReq")

	assert.Equal(t, userUID, creditsInfo.UserUID)
	assert.Equal(t, int64(100), creditsInfo.Balance)
	assert.Equal(t, int64(10), creditsInfo.DeductionBalance)
	assert.Equal(t, int64(230), creditsInfo.Credits) // 200+30
	assert.Equal(t, int64(55), creditsInfo.DeductionCredits) // 50+5

	assert.Equal(t, int64(200), creditsInfo.CurrentPlanCreditsBalance)
	assert.Equal(t, int64(50), creditsInfo.CurrentPlanCreditsDeductionBalance)
	assert.Equal(t, int64(30), creditsInfo.KYCDeductionCreditsBalance)
	assert.Equal(t, int64(5), creditsInfo.KYCDeductionCreditsDeductionBalance)
}

func Test_getCreditsInfo_freePlan(t *testing.T) {
	userUID := uuid.New()
	freePlanID := uuid.New()

	db := &mockDBClient{
		getSubscriptionFunc: func(opts *types.UserQueryOpts) (*types.Subscription, error) {
			return &types.Subscription{
				UserUID:  userUID,
				PlanName: types.FreeSubscriptionPlanName,
			}, nil
		},
		getAccountFunc: func(opts types.UserQueryOpts) (*types.Account, error) {
			return &types.Account{
				UserUID:         userUID,
				Balance:         0,
				DeductionBalance: 0,
			}, nil
		},
		getSubscriptionPlanFunc: func(planName string) (*types.SubscriptionPlan, error) {
			return &types.SubscriptionPlan{
				ID:   freePlanID,
				Name: planName,
			}, nil
		},
		getAvailableCreditsFunc: func(opts *types.UserQueryOpts) ([]types.Credits, error) {
			return []types.Credits{
				{
					UserUID:   userUID,
					FromID:    freePlanID.String(),
					Amount:    99,
					UsedAmount: 11,
				},
			}, nil
		},
	}

	oldDBClient := dao.DBClient
	dao.DBClient = db
	defer func() { dao.DBClient = oldDBClient }()

	creditsInfoAny, err := getCreditsInfo(userUID)
	require.NoError(t, err)

	creditsInfo, ok := creditsInfoAny.(CreditsInfoReq)
	require.True(t, ok)
	assert.Equal(t, int64(99), creditsInfo.CurrentPlanCreditsBalance)
	assert.Equal(t, int64(11), creditsInfo.CurrentPlanCreditsDeductionBalance)
	assert.Equal(t, int64(99), creditsInfo.KYCDeductionCreditsBalance)
	assert.Equal(t, int64(11), creditsInfo.KYCDeductionCreditsDeductionBalance)
}

func Test_getCreditsInfo_errorSubscription(t *testing.T) {
	userUID := uuid.New()
	db := &mockDBClient{
		getSubscriptionFunc: func(opts *types.UserQueryOpts) (*types.Subscription, error) {
			return nil, errors.New("db error")
		},
		getAccountFunc: func(opts types.UserQueryOpts) (*types.Account, error) {
			return &types.Account{}, nil
		},
		getSubscriptionPlanFunc: func(string) (*types.SubscriptionPlan, error) {
			return &types.SubscriptionPlan{}, nil
		},
		getAvailableCreditsFunc: func(*types.UserQueryOpts) ([]types.Credits, error) {
			return nil, nil
		},
	}
	oldDBClient := dao.DBClient
	dao.DBClient = db
	defer func() { dao.DBClient = oldDBClient }()

	_, err := getCreditsInfo(userUID)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to get subscription info")
}

func Test_getCreditsInfo_errorAccount(t *testing.T) {
	userUID := uuid.New()
	db := &mockDBClient{
		getSubscriptionFunc: func(opts *types.UserQueryOpts) (*types.Subscription, error) {
			return &types.Subscription{
				UserUID:  userUID,
				PlanName: "pro",
			}, nil
		},
		getAccountFunc: func(opts types.UserQueryOpts) (*types.Account, error) {
			return nil, errors.New("account db error")
		},
		getSubscriptionPlanFunc: func(string) (*types.SubscriptionPlan, error) {
			return &types.SubscriptionPlan{}, nil
		},
		getAvailableCreditsFunc: func(*types.UserQueryOpts) ([]types.Credits, error) {
			return nil, nil
		},
	}
	oldDBClient := dao.DBClient
	dao.DBClient = db
	defer func() { dao.DBClient = oldDBClient }()

	_, err := getCreditsInfo(userUID)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to get account")
}

func Test_getCreditsInfo_errorPlan(t *testing.T) {
	userUID := uuid.New()
	db := &mockDBClient{
		getSubscriptionFunc: func(opts *types.UserQueryOpts) (*types.Subscription, error) {
			return &types.Subscription{
				UserUID:  userUID,
				PlanName: "pro",
			}, nil
		},
		getAccountFunc: func(opts types.UserQueryOpts) (*types.Account, error) {
			return &types.Account{}, nil
		},
		getSubscriptionPlanFunc: func(planName string) (*types.SubscriptionPlan, error) {
			if planName == "pro" {
				return nil, errors.New("plan error")
			}
			return &types.SubscriptionPlan{}, nil
		},
		getAvailableCreditsFunc: func(*types.UserQueryOpts) ([]types.Credits, error) {
			return nil, nil
		},
	}
	oldDBClient := dao.DBClient
	dao.DBClient = db
	defer func() { dao.DBClient = oldDBClient }()

	_, err := getCreditsInfo(userUID)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to get subscription plan info")
}

func Test_getCreditsInfo_errorFreePlan(t *testing.T) {
	userUID := uuid.New()
	db := &mockDBClient{
		getSubscriptionFunc: func(opts *types.UserQueryOpts) (*types.Subscription, error) {
			return &types.Subscription{
				UserUID:  userUID,
				PlanName: "pro",
			}, nil
		},
		getAccountFunc: func(opts types.UserQueryOpts) (*types.Account, error) {
			return &types.Account{}, nil
		},
		getSubscriptionPlanFunc: func(planName string) (*types.SubscriptionPlan, error) {
			if planName == types.FreeSubscriptionPlanName {
				return nil, errors.New("free plan error")
			}
			return &types.SubscriptionPlan{}, nil
		},
		getAvailableCreditsFunc: func(*types.UserQueryOpts) ([]types.Credits, error) {
			return nil, nil
		},
	}
	oldDBClient := dao.DBClient
	dao.DBClient = db
	defer func() { dao.DBClient = oldDBClient }()

	_, err := getCreditsInfo(userUID)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to get free plan info")
}

func Test_getCreditsInfo_errorAvailableCredits(t *testing.T) {
	userUID := uuid.New()
	db := &mockDBClient{
		getSubscriptionFunc: func(opts *types.UserQueryOpts) (*types.Subscription, error) {
			return &types.Subscription{
				UserUID:  userUID,
				PlanName: "pro",
			}, nil
		},
		getAccountFunc: func(opts types.UserQueryOpts) (*types.Account, error) {
			return &types.Account{}, nil
		},
		getSubscriptionPlanFunc: func(planName string) (*types.SubscriptionPlan, error) {
			return &types.SubscriptionPlan{}, nil
		},
		getAvailableCreditsFunc: func(*types.UserQueryOpts) ([]types.Credits, error) {
			return nil, errors.New("credits error")
		},
	}
	oldDBClient := dao.DBClient
	dao.DBClient = db
	defer func() { dao.DBClient = oldDBClient }()

	_, err := getCreditsInfo(userUID)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to get available credits")
}

// The original integration test is retained as-is.
func Test_getCreditsInfo(t *testing.T) {
	userUID, err := uuid.Parse("03c7ef29-4556-4f5d-a54b-969f315658a3")
	if err != nil {
		t.Fatalf("failed to parse UUID: %v", err)
	}
	os.Setenv("LOCAL_REGION", "")
	dao.DBClient, err = dao.NewAccountForTest("", "", "")
	if err != nil {
		t.Fatalf("failed to create DB client: %v", err)
	}

	start := time.Now()
	userCreditsInfo, err := getCreditsInfo(userUID)
	if err != nil {
		t.Fatalf("getCreditsInfo() error = %v", err)
	}

	t.Logf("getCreditsInfo() userCreditsInfo = %#+v, %s", userCreditsInfo, time.Since(start))
}
