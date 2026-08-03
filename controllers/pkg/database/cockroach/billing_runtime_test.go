package cockroach

import (
	"context"
	"strings"
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

func TestBillingHistoryQueriesUseCompositeIndexes(t *testing.T) {
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
	if err := db.Exec(`
		CREATE TABLE "Debt" (
			user_uid TEXT PRIMARY KEY,
			account_debt_status TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL
		);
		CREATE TABLE "DebtStatusRecord" (
			id BIGINT PRIMARY KEY,
			user_uid TEXT NOT NULL,
			last_status TEXT NOT NULL,
			create_at TIMESTAMPTZ NOT NULL
		);
		CREATE TABLE "WorkspaceSubscriptionTransaction" (
			id BIGINT PRIMARY KEY,
			region_domain TEXT NOT NULL,
			workspace TEXT NOT NULL,
			status TEXT NOT NULL,
			pay_status TEXT NOT NULL,
			operator TEXT NOT NULL,
			updated_at TIMESTAMPTZ NOT NULL
		);
		CREATE TABLE "Credits" (
			id BIGINT PRIMARY KEY,
			user_uid TEXT NOT NULL,
			amount BIGINT NOT NULL,
			used_amount BIGINT NOT NULL,
			expire_at TIMESTAMPTZ NOT NULL,
			start_at TIMESTAMPTZ NOT NULL,
			status TEXT NOT NULL
		);`).Error; err != nil {
		t.Fatal(err)
	}
	if err := ensureBillingQueryIndexes(db); err != nil {
		t.Fatal(err)
	}
	if err := db.Exec(`
		INSERT INTO "Debt" (user_uid, account_debt_status, created_at)
		SELECT CASE WHEN i = 1 THEN 'target-user' ELSE 'user-' || i::TEXT END,
			'NormalPeriod',
			now() - INTERVAL '1 day'
		FROM generate_series(1, 1000) AS series(i);`).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Exec(`
		INSERT INTO "DebtStatusRecord" (id, user_uid, last_status, create_at)
		SELECT i,
			CASE WHEN i % 1000 = 0 THEN 'target-user' ELSE 'user-' || i::TEXT END,
			'NormalPeriod',
			now() - (i || ' seconds')::INTERVAL
		FROM generate_series(1, 100000) AS series(i);`).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Exec(`
		INSERT INTO "WorkspaceSubscriptionTransaction" (
			id, region_domain, workspace, status, pay_status, operator, updated_at
		)
		SELECT i,
			'test-region',
			CASE WHEN i % 1000 = 0 THEN 'target-workspace' ELSE 'workspace-' || i::TEXT END,
			'completed',
			CASE WHEN i % 2 = 0 THEN 'paid' ELSE 'no_need' END,
			CASE WHEN i % 1000 = 0 THEN 'canceled' WHEN i % 2 = 0 THEN 'created' ELSE 'canceled' END,
			now() - (i || ' seconds')::INTERVAL
		FROM generate_series(1, 100000) AS series(i);`).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Exec(`
		INSERT INTO "Credits" (id, user_uid, amount, used_amount, expire_at, start_at, status)
		SELECT i,
			CASE WHEN i % 1000 = 0 THEN 'target-user' ELSE 'user-' || i::TEXT END,
			100,
			0,
			now() + INTERVAL '1 day',
			now() - INTERVAL '1 day',
			'active'
		FROM generate_series(1, 100000) AS series(i);`).Error; err != nil {
		t.Fatal(err)
	}

	plans := map[string]string{
		"debt first status": `EXPLAIN (ANALYZE, COSTS OFF)
			SELECT d.user_uid,
				COALESCE(first_record.last_status, d.account_debt_status) AS account_debt_status
			FROM "Debt" AS d
			LEFT JOIN LATERAL (
				SELECT r.last_status
				FROM "DebtStatusRecord" AS r
				WHERE r.user_uid = d.user_uid
				  AND r.create_at > now() - INTERVAL '2 hours'
				ORDER BY r.create_at ASC, r.id ASC
				LIMIT 1
			) AS first_record ON TRUE
			WHERE d.created_at <= now()`,
		"subscription period": `EXPLAIN (ANALYZE, COSTS OFF)
			SELECT * FROM "WorkspaceSubscriptionTransaction"
			WHERE region_domain = 'test-region'
			  AND workspace IN ('target-workspace')
			  AND status = 'completed'
			  AND pay_status IN ('paid', 'no_need')
			  AND updated_at <= now()`,
		"subscription terminal": `EXPLAIN (ANALYZE, COSTS OFF)
			SELECT * FROM "WorkspaceSubscriptionTransaction"
			WHERE region_domain = 'test-region'
			  AND workspace IN ('target-workspace')
			  AND status = 'completed'
			  AND operator IN ('canceled', 'deleted')
			  AND updated_at <= now()`,
		"credits active period": `EXPLAIN (ANALYZE, COSTS OFF)
			SELECT * FROM "Credits"
			WHERE user_uid = 'target-user'
			  AND start_at <= now()
			  AND expire_at > now()
			  AND status = 'active'
			ORDER BY expire_at ASC`,
	}
	wantIndexes := map[string]string{
		"debt first status":     "idx_debt_record_user_time",
		"subscription period":   "idx_workspace_subscription_billing_history",
		"subscription terminal": "idx_workspace_subscription_billing_history",
		"credits active period": "idx_credits_active_period",
	}
	for name, query := range plans {
		rows, err := db.Raw(query).Rows()
		if err != nil {
			t.Fatalf("%s explain: %v", name, err)
		}
		var plan strings.Builder
		for rows.Next() {
			var line string
			if err := rows.Scan(&line); err != nil {
				rows.Close()
				t.Fatalf("%s scan explain: %v", name, err)
			}
			plan.WriteString(line)
		}
		if err := rows.Close(); err != nil {
			t.Fatalf("%s close explain: %v", name, err)
		}
		planText := plan.String()
		t.Logf("%s: %s", name, planText)
		if !strings.Contains(planText, wantIndexes[name]) {
			t.Fatalf("%s did not use %s: %s", name, wantIndexes[name], planText)
		}
	}
	t.Logf("indexed historical billing queries completed against 100000-row tables")
}
