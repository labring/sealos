package controllers

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"
)

type MockTrafficDB struct {
	mock.Mock
	database.Interface
}

func (m *MockTrafficDB) GetNamespaceTraffic(ctx context.Context, start, end time.Time) (map[string]int64, error) {
	args := m.Called(ctx, start, end)
	return args.Get(0).(map[string]int64), args.Error(1)
}

type MockDB struct {
	*gorm.DB
	mock.Mock
}

func (m *MockDB) Model(value interface{}) *gorm.DB {
	return m.DB.Model(value)
}

func TestUserTrafficController_BatchGetUserUID(t *testing.T) {
	tests := []struct {
		name    string
		dbData  []types.RegionUserCr
		want    map[string]uuid.UUID
		wantErr bool
	}{
		{
			name: "success case",
			dbData: []types.RegionUserCr{
				{CrName: "user1", UserUID: uuid.New()},
				{CrName: "user2", UserUID: uuid.New()},
			},
			want: map[string]uuid.UUID{
				"user1": uuid.New(),
				"user2": uuid.New(),
			},
			wantErr: false,
		},
		{
			name: "skip nil uuid",
			dbData: []types.RegionUserCr{
				{CrName: "user1", UserUID: uuid.Nil},
				{CrName: "user2", UserUID: uuid.New()},
			},
			want: map[string]uuid.UUID{
				"user2": uuid.New(),
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db := &MockDB{DB: &gorm.DB{}}
			controller := &UserTrafficController{
				AccountReconciler: &AccountReconciler{
					AccountV2: &AccountV2{
						localDB: db,
					},
				},
			}

			got, err := controller.BatchGetUserUID()
			if tt.wantErr {
				assert.Error(t, err)
				return
			}

			assert.NoError(t, err)
			assert.Equal(t, len(tt.want), len(got))
		})
	}
}

func TestUserTrafficController_processUserTraffic(t *testing.T) {
	tests := []struct {
		name      string
		resultMap map[string]int64
		wantErr   bool
	}{
		{
			name: "success case",
			resultMap: map[string]int64{
				"ns-user1": 1000,
				"ns-user2": 2000,
			},
			wantErr: false,
		},
		{
			name: "skip non ns- prefix",
			resultMap: map[string]int64{
				"user1": 1000,
				"ns-user2": 2000,
			},
			wantErr: false,
		},
		{
			name:      "empty map",
			resultMap: map[string]int64{},
			wantErr:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			controller := &UserTrafficController{
				GlobalDB: &gorm.DB{},
				AccountReconciler: &AccountReconciler{
					AccountV2: &AccountV2{
						localDB: &gorm.DB{},
					},
				},
			}

			err := controller.processUserTraffic(tt.resultMap)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
		})
	}
}

func TestUserTrafficMonitor_GetStats(t *testing.T) {
	monitor := &UserTrafficMonitor{
		suspendQueue: make(chan uuid.UUID, 10),
	}

	// Add some items to queue
	monitor.suspendQueue <- uuid.New()
	monitor.suspendQueue <- uuid.New()

	stats := monitor.GetStats()
	assert.Equal(t, int64(2), stats.PendingUsers)
}

func TestNewUserTrafficMonitor(t *testing.T) {
	controller := &UserTrafficController{
		GlobalDB: &gorm.DB{},
	}

	monitor, err := NewUserTrafficMonitor(controller)
	assert.NoError(t, err)
	assert.NotNil(t, monitor)
	assert.Equal(t, WorkerPoolSize, cap(monitor.workerPool))
	assert.Equal(t, 10000, cap(monitor.suspendQueue))
	assert.Equal(t, 10000, cap(monitor.resumeQueue))
}

func TestUserTrafficController_ProcessTrafficWithTimeRange(t *testing.T) {
	mockTrafficDB := &MockTrafficDB{}
	controller := &UserTrafficController{
		TrafficDB: mockTrafficDB,
		GlobalDB:  &gorm.DB{},
		AccountReconciler: &AccountReconciler{
			AccountV2: &AccountV2{
				localDB: &gorm.DB{},
			},
		},
	}

	mockTrafficDB.On("GetNamespaceTraffic", mock.Anything, mock.Anything, mock.Anything).
		Return(map[string]int64{"ns-user1": 1000}, nil)

	done := make(chan struct{})
	go func() {
		time.Sleep(2 * time.Second)
		close(done)
	}()

	go controller.ProcessTrafficWithTimeRange()

	<-done
}
