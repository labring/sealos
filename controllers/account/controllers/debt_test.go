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

func TestDebtReconciler_getUniqueUsers(t *testing.T) {
	tests := []struct {
		name      string
		table     interface{}
		timeField string
		start     time.Time
		end       time.Time
		mockDB    func() *gorm.DB
		want      []uuid.UUID
		wantErr   bool
	}{
		{
			name:      "get account users",
			table:     &types.Account{},
			timeField: "updated_at",
			start:     time.Now().Add(-24 * time.Hour),
			end:       time.Now(),
			mockDB: func() *gorm.DB {
				db := &gorm.DB{}
				// Mock implementation
				return db
			},
			want:    []uuid.UUID{uuid.New()},
			wantErr: false,
		},
		{
			name:      "get subscription users",
			table:     &types.Subscription{},
			timeField: "update_at",
			start:     time.Now().Add(-24 * time.Hour),
			end:       time.Now(),
			mockDB: func() *gorm.DB {
				db := &gorm.DB{}
				// Mock implementation
				return db
			},
			want:    []uuid.UUID{uuid.New()},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db := tt.mockDB()
			got, err := getUniqueUsers(db, tt.table, tt.timeField, tt.start, tt.end)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
			assert.Equal(t, len(tt.want), len(got))
		})
	}
}

func TestDebtReconciler_refreshDebtStatus(t *testing.T) {
	tests := []struct {
		name       string
		userUID    uuid.UUID
		skipSendMsg bool
		mockDB     func() *gorm.DB
		wantErr    bool
	}{
		{
			name:       "refresh normal user debt status",
			userUID:    uuid.New(),
			skipSendMsg: false,
			mockDB: func() *gorm.DB {
				db := &gorm.DB{}
				// Mock implementation
				return db
			},
			wantErr: false,
		},
		{
			name:       "refresh non-existent user",
			userUID:    uuid.New(),
			skipSendMsg: false,
			mockDB: func() *gorm.DB {
				db := &gorm.DB{}
				// Mock implementation returning not found
				return db
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &DebtReconciler{
				AccountV2: nil, // Mock AccountV2
			}
			err := r.refreshDebtStatus(tt.userUID, tt.skipSendMsg)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
		})
	}
}

func TestDebtReconciler_Start(t *testing.T) {
	tests := []struct {
		name    string
		mockDB  func() *gorm.DB
		wantErr bool
	}{
		{
			name: "start reconciler successfully",
			mockDB: func() *gorm.DB {
				db := &gorm.DB{}
				// Mock implementation
				return db
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &DebtReconciler{
				AccountV2: nil, // Mock AccountV2
				processID: uuid.New().String(),
			}
			err := r.Start(context.Background())
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
		})
	}
}

func TestDebtReconciler_ResumeBalance(t *testing.T) {
	tests := []struct {
		name    string
		userUID uuid.UUID
		mockDB  func() *gorm.DB
		wantErr bool
	}{
		{
			name:    "resume balance successfully",
			userUID: uuid.New(),
			mockDB: func() *gorm.DB {
				db := &gorm.DB{}
				// Mock implementation
				return db
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &DebtReconciler{
				AccountV2: nil, // Mock AccountV2
			}
			err := r.ResumeBalance(tt.userUID)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
		})
	}
}

func TestDebtReconciler_SendUserDebtMsg(t *testing.T) {
	tests := []struct {
		name         string
		userUID      uuid.UUID
		oweamount    int64
		status       types.DebtStatusType
		isBasicUser  bool
		mockConfig   func() *DebtReconciler
		wantErr      bool
	}{
		{
			name:        "send debt message successfully",
			userUID:     uuid.New(),
			oweamount:   1000000,
			status:      types.LowBalancePeriod,
			isBasicUser: false,
			mockConfig: func() *DebtReconciler {
				return &DebtReconciler{
					AccountV2: nil, // Mock AccountV2
					SmsConfig: nil,
					VmsConfig: nil,
					smtpConfig: nil,
				}
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := tt.mockConfig()
			err := r.SendUserDebtMsg(tt.userUID, tt.oweamount, tt.status, tt.isBasicUser)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
		})
	}
}
