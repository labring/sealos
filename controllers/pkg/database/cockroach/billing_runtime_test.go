package cockroach

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/testcontainers/testcontainers-go"
	postgrescontainer "github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestBillingDeductionWithPostgresRuntimeDoesNotCreateTransaction(t *testing.T) {
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
	if err := db.AutoMigrate(&types.Account{}, &types.AccountTransaction{}); err != nil {
		t.Fatal(err)
	}
	userUID := uuid.New()
	if err := db.Create(&types.Account{
		UserUID: userUID, CreateRegionID: "test", Balance: 1000,
	}).Error; err != nil {
		t.Fatal(err)
	}
	regionUID := uuid.New()
	account := &Cockroach{
		DB: db, Localdb: db, LocalRegion: &types.Region{UID: regionUID, Domain: "test"},
		ownerUsrUIDMap: &sync.Map{}, ownerUsrIDMap: &sync.Map{},
	}
	for range 2 {
		if err := account.AddDeductionBalance(
			&types.UserQueryOpts{UID: userUID}, 125,
		); err != nil {
			t.Fatal(err)
		}
	}
	var stored types.Account
	if err := db.First(&stored, `"userUid" = ?`, userUID).Error; err != nil {
		t.Fatal(err)
	}
	if stored.DeductionBalance != 250 {
		t.Fatalf("deduction balance = %d", stored.DeductionBalance)
	}
	var transactionCount int64
	if err := db.Model(&types.AccountTransaction{}).Count(&transactionCount).Error; err != nil {
		t.Fatal(err)
	}
	if transactionCount != 0 {
		t.Fatalf("transaction count = %d", transactionCount)
	}
}

func TestHistoricalBillingDeductionUsesCreditsActiveAtBillingTime(t *testing.T) {
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
	if err := db.AutoMigrate(
		&types.Account{}, &types.AccountTransaction{}, &types.Credits{},
	); err != nil {
		t.Fatal(err)
	}
	userUID := uuid.New()
	if err := db.Create(&types.Account{
		UserUID: userUID, CreateRegionID: "test", Balance: 1000,
	}).Error; err != nil {
		t.Fatal(err)
	}
	creditID := uuid.New()
	billingTime := time.Now().UTC().Add(-2 * time.Hour)
	if err := db.Create(&types.Credits{
		ID: creditID, UserUID: userUID, Amount: 100, Status: types.CreditsStatusActive,
		StartAt: billingTime.Add(-time.Hour), ExpireAt: billingTime.Add(time.Hour),
	}).Error; err != nil {
		t.Fatal(err)
	}
	regionUID := uuid.New()
	account := &Cockroach{
		DB: db, Localdb: db, LocalRegion: &types.Region{UID: regionUID, Domain: "test"},
		ownerUsrUIDMap: &sync.Map{}, ownerUsrIDMap: &sync.Map{},
	}
	if err := account.AddDeductionBalanceWithCreditsAt(
		&types.UserQueryOpts{UID: userUID},
		125,
		[]string{"historical-credit-order"},
		billingTime,
	); err != nil {
		t.Fatal(err)
	}
	var storedCredit types.Credits
	if err := db.First(&storedCredit, "id = ?", creditID).Error; err != nil {
		t.Fatal(err)
	}
	if storedCredit.UsedAmount != 100 {
		t.Fatalf("used credits = %d", storedCredit.UsedAmount)
	}
	var storedAccount types.Account
	if err := db.First(&storedAccount, `"userUid" = ?`, userUID).Error; err != nil {
		t.Fatal(err)
	}
	if storedAccount.DeductionBalance != 25 {
		t.Fatalf("deduction balance = %d", storedAccount.DeductionBalance)
	}
	var transactionCount int64
	if err := db.Model(&types.AccountTransaction{}).Count(&transactionCount).Error; err != nil {
		t.Fatal(err)
	}
	if transactionCount != 0 {
		t.Fatalf("transaction count = %d", transactionCount)
	}
}
