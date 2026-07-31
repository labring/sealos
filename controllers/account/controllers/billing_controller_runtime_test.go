package controllers

import (
	"context"
	"testing"
	"time"

	"github.com/go-logr/logr"
	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/controllers/pkg/utils/maps"
	"github.com/testcontainers/testcontainers-go"
	postgrescontainer "github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type debtSnapshotAccountV2 struct {
	database.AccountV2
	db *gorm.DB
}

func (a *debtSnapshotAccountV2) GetGlobalDB() *gorm.DB {
	return a.db
}

func TestLoadDebtUsersAtUsesFirstLaterTransition(t *testing.T) {
	testcontainers.SkipIfProviderIsNotHealthy(t)
	ctx := context.Background()
	container, err := postgrescontainer.Run(ctx, "postgres:16-alpine",
		postgrescontainer.WithDatabase("account"),
		postgrescontainer.WithUsername("account"),
		postgrescontainer.WithPassword("account"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").WithOccurrence(2),
		),
	)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := container.Terminate(ctx); err != nil {
			t.Errorf("terminate PostgreSQL: %v", err)
		}
	})
	dsn, err := container.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatal(err)
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&types.Debt{}, &types.DebtStatusRecord{}); err != nil {
		t.Fatal(err)
	}

	endHourTime := time.Now().UTC().Add(-time.Hour).Truncate(time.Hour)
	historicalUserUID := uuid.New()
	currentDebtUserUID := uuid.New()
	createdLaterUserUID := uuid.New()
	debts := []types.Debt{
		{
			UserUID: historicalUserUID, CreatedAt: endHourTime.Add(-time.Hour),
			UpdatedAt: endHourTime.Add(20 * time.Minute), AccountDebtStatus: types.NormalPeriod,
		},
		{
			UserUID: currentDebtUserUID, CreatedAt: endHourTime.Add(-time.Hour),
			UpdatedAt: endHourTime.Add(-time.Hour), AccountDebtStatus: types.DebtPeriod,
		},
		{
			UserUID: createdLaterUserUID, CreatedAt: endHourTime.Add(time.Minute),
			UpdatedAt: endHourTime.Add(time.Minute), AccountDebtStatus: types.DebtPeriod,
		},
	}
	if err := db.Create(&debts).Error; err != nil {
		t.Fatal(err)
	}
	records := []types.DebtStatusRecord{
		{
			ID: uuid.New(), UserUID: historicalUserUID,
			LastStatus: types.NormalPeriod, CurrentStatus: types.DebtPeriod,
			CreateAt: endHourTime,
		},
		{
			ID: uuid.New(), UserUID: historicalUserUID,
			LastStatus: types.DebtPeriod, CurrentStatus: types.NormalPeriod,
			CreateAt: endHourTime.Add(20 * time.Minute),
		},
	}
	if err := db.Create(&records).Error; err != nil {
		t.Fatal(err)
	}

	DebtUserMap = maps.NewConcurrentNullValueMap()
	reconciler := &BillingReconciler{
		AccountV2: &debtSnapshotAccountV2{db: db},
		Logger:    logr.Discard(),
	}
	if err := reconciler.loadDebtUsersAt(endHourTime); err != nil {
		t.Fatal(err)
	}
	if _, inDebt := DebtUserMap.Get(historicalUserUID.String()); inDebt {
		t.Fatal("historical user did not use the first later transition")
	}
	if _, inDebt := DebtUserMap.Get(currentDebtUserUID.String()); !inDebt {
		t.Fatal("current debt user without a later transition was omitted")
	}
	if _, inDebt := DebtUserMap.Get(createdLaterUserUID.String()); inDebt {
		t.Fatal("debt created after the billing hour was included")
	}
}
