package controllers

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

func TestDebtReconciler_RefreshDebtStatus(t *testing.T) {
	tests := []struct {
		name     string
		userUID  uuid.UUID
		account  *types.Account
		debt     *types.Debt
		wantErr  bool
		errType  error
		wantDebt types.DebtStatusType
	}{
		{
			name:    "account not found",
			userUID: uuid.New(),
			wantErr: true,
		},
		{
			name:    "debt not found",
			userUID: uuid.New(),
			account: &types.Account{
				UserUID: uuid.New(),
				Balance: 100,
			},
			wantErr: false,
		},
		{
			name:    "normal to debt period",
			userUID: uuid.New(),
			account: &types.Account{
				UserUID:          uuid.New(),
				Balance:         -100,
				DeductionBalance: 0,
				UsableCredits:    0,
			},
			debt: &types.Debt{
				UserUID:           uuid.New(),
				AccountDebtStatus: types.NormalPeriod,
				UpdatedAt:         time.Now().Add(-8 * 24 * time.Hour),
			},
			wantErr:  false,
			wantDebt: types.DebtPeriod,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &DebtReconciler{
				AccountV2: &mockAccountV2{
					account: tt.account,
					debt:    tt.debt,
				},
			}

			err := r.RefreshDebtStatus(tt.userUID)
			if tt.wantErr {
				assert.Error(t, err)
				if tt.errType != nil {
					assert.IsType(t, tt.errType, err)
				}
			} else {
				assert.NoError(t, err)
				if tt.debt != nil && tt.wantDebt != "" {
					assert.Equal(t, tt.wantDebt, tt.debt.AccountDebtStatus)
				}
			}
		})
	}
}

func TestDebtReconciler_ResumeBalance(t *testing.T) {
	tests := []struct {
		name    string
		userUID uuid.UUID
		account *types.Account
		wantErr bool
	}{
		{
			name:    "account not found",
			userUID: uuid.New(),
			wantErr: true,
		},
		{
			name:    "no need to resume",
			userUID: uuid.New(),
			account: &types.Account{
				UserUID:          uuid.New(),
				Balance:         100,
				DeductionBalance: 50,
			},
			wantErr: false,
		},
		{
			name:    "resume needed",
			userUID: uuid.New(),
			account: &types.Account{
				UserUID:          uuid.New(),
				Balance:         100,
				DeductionBalance: 200,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &DebtReconciler{
				AccountV2: &mockAccountV2{
					account: tt.account,
				},
			}

			err := r.ResumeBalance(tt.userUID)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

type mockAccountV2 struct {
	account *types.Account
	debt    *types.Debt
}

func (m *mockAccountV2) GetAccountWithCredits(userUID uuid.UUID) (*types.Account, error) {
	if m.account == nil {
		return nil, gorm.ErrRecordNotFound
	}
	return m.account, nil
}

func (m *mockAccountV2) GetAccount(opts *types.UserQueryOpts) (*types.Account, error) {
	if m.account == nil {
		return nil, gorm.ErrRecordNotFound
	}
	return m.account, nil
}

func (m *mockAccountV2) GetGlobalDB() *gorm.DB {
	return &gorm.DB{}
}

func (m *mockAccountV2) GlobalTransactionHandler(fc func(*gorm.DB) error) error {
	return fc(&gorm.DB{})
}

func (m *mockAccountV2) GetUser(opts *types.UserQueryOpts) (*types.User, error) {
	return &types.User{
		Status: types.UserStatusNormal,
	}, nil
}

func (m *mockAccountV2) GetUserOauthProvider(opts *types.UserQueryOpts) ([]types.UserOauthProvider, error) {
	return []types.UserOauthProvider{}, nil
}

func (m *mockAccountV2) GetLocalRegion() *types.Region {
	return &types.Region{}
}

func TestDebtReconciler_Start(t *testing.T) {
	r := &DebtReconciler{
		AccountV2: &mockAccountV2{},
		processID: "test-process",
	}

	ctx := context.Background()
	err := r.Start(ctx)
	assert.NoError(t, err)
}

func TestGetUniqueUsers(t *testing.T) {
	db := &gorm.DB{}
	startTime := time.Now().Add(-24 * time.Hour)
	endTime := time.Now()

	tests := []struct {
		name      string
		table     interface{}
		timeField string
	}{
		{
			name:      "account transactions",
			table:     &types.AccountTransaction{},
			timeField: "created_at",
		},
		{
			name:      "payments",
			table:     &types.Payment{},
			timeField: "created_at",
		},
		{
			name:      "accounts",
			table:     &types.Account{},
			timeField: "updated_at",
		},
		{
			name:      "subscriptions",
			table:     &types.Subscription{},
			timeField: "update_at",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			users := getUniqueUsers(db, tt.table, tt.timeField, startTime, endTime)
			assert.NotNil(t, users)
		})
	}
}
