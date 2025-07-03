package controllers

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	v1 "github.com/labring/sealos/controllers/account/api/v1"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

type mockAccountV2 struct {
	db *gorm.DB
}

func (m *mockAccountV2) GetGlobalDB() *gorm.DB {
	return m.db
}

func (m *mockAccountV2) GetAccountWithCredits(userUID uuid.UUID) (*types.Account, error) {
	return &types.Account{
		UserUID:          userUID,
		Balance:         1000000,
		DeductionBalance: 500000,
		UsableCredits:   100000,
	}, nil
}

func (m *mockAccountV2) GetAccount(opts *types.UserQueryOpts) (*types.Account, error) {
	return &types.Account{
		UserUID:          opts.UID,
		Balance:         1000000,
		DeductionBalance: 500000,
	}, nil
}

func (m *mockAccountV2) GetUser(opts *types.UserQueryOpts) (*types.User, error) {
	return &types.User{
		UID:    opts.UID,
		Status: types.UserStatusNormal,
	}, nil
}

func (m *mockAccountV2) GetUserOauthProvider(opts *types.UserQueryOpts) ([]types.UserOauth, error) {
	return []types.UserOauth{
		{
			ProviderType: types.OauthProviderTypePhone,
			ProviderID:   "1234567890",
		},
		{
			ProviderType: types.OauthProviderTypeEmail,
			ProviderID:   "test@test.com",
		},
	}, nil
}

func (m *mockAccountV2) GlobalTransactionHandler(fc func(*gorm.DB) error) error {
	return fc(m.db)
}

func TestDebtReconciler_Start(t *testing.T) {
	r := &DebtReconciler{
		AccountV2: &mockAccountV2{},
		processID: "test-process",
		userLocks: sync.Map{},
		failedUserLocks: sync.Map{},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	err := r.Start(ctx)
	assert.NoError(t, err)
}

func TestDebtReconciler_RefreshDebtStatus(t *testing.T) {
	r := &DebtReconciler{
		AccountV2: &mockAccountV2{},
		userLocks: sync.Map{},
		failedUserLocks: sync.Map{},
	}

	userUID := uuid.New()
	err := r.RefreshDebtStatus(userUID)
	assert.NoError(t, err)
}

func TestDebtReconciler_ResumeBalance(t *testing.T) {
	r := &DebtReconciler{
		AccountV2: &mockAccountV2{},
	}

	userUID := uuid.New()
	err := r.ResumeBalance(userUID)
	assert.NoError(t, err)
}

func TestDebtReconciler_processUsersInParallel(t *testing.T) {
	r := &DebtReconciler{
		AccountV2: &mockAccountV2{},
		userLocks: sync.Map{},
		failedUserLocks: sync.Map{},
	}

	users := []uuid.UUID{uuid.New(), uuid.New()}
	r.processUsersInParallel(users)
}

func TestDebtReconciler_SendUserDebtMsg(t *testing.T) {
	r := &DebtReconciler{
		AccountV2: &mockAccountV2{},
	}

	userUID := uuid.New()
	err := r.SendUserDebtMsg(userUID, -1000000, types.DebtPeriod, false)
	assert.NoError(t, err)
}

func TestDebtReconciler_sendFlushDebtResourceStatusRequest(t *testing.T) {
	r := &DebtReconciler{
		AccountV2: &mockAccountV2{},
		allRegionDomain: []string{"test.domain"},
	}

	req := AdminFlushResourceStatusReq{
		UserUID: uuid.New(),
		LastDebtStatus: types.NormalPeriod,
		CurrentDebtStatus: types.DebtPeriod,
		IsBasicUser: false,
	}

	err := r.sendFlushDebtResourceStatusRequest(req)
	assert.Error(t, err) // Will fail due to no JWT manager
}

func TestDebtReconciler_retryFailedUsers(t *testing.T) {
	r := &DebtReconciler{
		AccountV2: &mockAccountV2{},
		userLocks: sync.Map{},
		failedUserLocks: sync.Map{},
	}

	userUID := uuid.New()
	r.failedUserLocks.Store(userUID, 1)

	done := make(chan bool)
	go func() {
		time.Sleep(100 * time.Millisecond)
		done <- true
	}()

	r.retryFailedUsers()
	<-done
}
