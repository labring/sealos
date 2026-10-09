// Copyright © 2026 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package cockroach

import (
	"context"
	"fmt"
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

func setupWorkspacePackageTestDB(t *testing.T) *gorm.DB {
	t.Helper()
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
	// Match the production connection: TranslateError changes which branch of
	// isUniqueViolation fires on a duplicate-key failure.
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{TranslateError: true})
	if err != nil {
		t.Fatal(err)
	}
	ck := &Cockroach{
		DB: db, Localdb: db,
		LocalRegion:    &types.Region{UID: uuid.New(), Domain: "test"},
		ownerUsrUIDMap: &sync.Map{}, ownerUsrIDMap: &sync.Map{},
	}
	if err := ck.InitTables(); err != nil {
		t.Fatal(err)
	}
	return db
}

func seedWorkspaceSubscription(t *testing.T, db *gorm.DB) *types.WorkspaceSubscription {
	t.Helper()
	sub := &types.WorkspaceSubscription{
		ID:            uuid.New(),
		Workspace:     "ns-" + uuid.NewString()[:8],
		RegionDomain:  "test.sealos.io",
		UserUID:       uuid.New(),
		PlanName:      "starter",
		Status:        types.SubscriptionStatusNormal,
		PayStatus:     types.SubscriptionPayStatusPaid,
		TrafficStatus: types.WorkspaceTrafficStatusActive,
	}
	if err := db.Create(sub).Error; err != nil {
		t.Fatalf("failed to seed workspace subscription: %v", err)
	}
	return sub
}

func activeAIQuotaPackages(t *testing.T, db *gorm.DB, subID uuid.UUID) []types.WorkspaceAIQuotaPackage {
	t.Helper()
	var pkgs []types.WorkspaceAIQuotaPackage
	err := db.Where("workspace_subscription_id = ? AND status = ?", subID, types.PackageStatusActive).
		Find(&pkgs).Error
	if err != nil {
		t.Fatalf("failed to list packages: %v", err)
	}
	return pkgs
}

func grantAIQuota(t *testing.T, db *gorm.DB, subID uuid.UUID, quota int64, fromID string, isUpgrade bool) {
	t.Helper()
	err := AddWorkspaceSubscriptionAIQuotaPackageWithUpgrade(
		db, subID, quota, time.Now().Add(30*24*time.Hour),
		types.PKGFromWorkspaceSubscription, fromID, isUpgrade,
	)
	if err != nil {
		t.Fatalf("AddWorkspaceSubscriptionAIQuotaPackageWithUpgrade() error = %v", err)
	}
}

func activeTrafficPackages(t *testing.T, db *gorm.DB, subID uuid.UUID) []types.WorkspaceTraffic {
	t.Helper()
	var pkgs []types.WorkspaceTraffic
	err := db.Where("workspace_subscription_id = ? AND status = ?",
		subID, types.WorkspaceTrafficStatusActive).Find(&pkgs).Error
	if err != nil {
		t.Fatalf("failed to list traffic packages: %v", err)
	}
	return pkgs
}

type trafficGrantOutcome struct {
	granted       bool
	shouldSuspend bool
}

func grantTraffic(
	t *testing.T,
	db *gorm.DB,
	subID uuid.UUID,
	totalMiB int64,
	fromID string,
	isUpgrade bool,
) trafficGrantOutcome {
	t.Helper()
	granted, shouldSuspend, err := AddWorkspaceSubscriptionTrafficPackageWithUpgrade(
		db, subID, totalMiB, time.Now().Add(30*24*time.Hour),
		types.WorkspaceTrafficFromWorkspaceSubscription, fromID, isUpgrade,
	)
	if err != nil {
		t.Fatalf("AddWorkspaceSubscriptionTrafficPackageWithUpgrade() error = %v", err)
	}
	return trafficGrantOutcome{granted: granted, shouldSuspend: shouldSuspend}
}

func TestUpgradeAIQuotaPackageSemantics(t *testing.T) {
	db := setupWorkspacePackageTestDB(t)

	// An upgrade must expire the old plan's package and grant the new plan's
	// full quota, not the delta (labring/sealos-private#108).
	t.Run("upgrade grants full quota", func(t *testing.T) {
		sub := seedWorkspaceSubscription(t, db)
		grantAIQuota(t, db, sub.ID, 1_000_000, uuid.NewString(), false)
		grantAIQuota(t, db, sub.ID, 20_000_000, uuid.NewString(), true)

		pkgs := activeAIQuotaPackages(t, db, sub.ID)
		if len(pkgs) != 1 {
			t.Fatalf("want exactly 1 active package after upgrade, got %d", len(pkgs))
		}
		if pkgs[0].Total != 20_000_000 {
			t.Fatalf("want full new plan quota 20000000, got %d", pkgs[0].Total)
		}
	})

	// An upgrade between plans with equal quota must still rotate the package
	// so its expiry follows the reset billing cycle.
	t.Run("equal quota upgrade still rotates", func(t *testing.T) {
		sub := seedWorkspaceSubscription(t, db)
		newFromID := uuid.NewString()
		grantAIQuota(t, db, sub.ID, 1_000_000, uuid.NewString(), false)
		grantAIQuota(t, db, sub.ID, 1_000_000, newFromID, true)

		pkgs := activeAIQuotaPackages(t, db, sub.ID)
		if len(pkgs) != 1 {
			t.Fatalf("want exactly 1 active package after equal-quota upgrade, got %d", len(pkgs))
		}
		if pkgs[0].FromID != newFromID {
			t.Fatalf("want the new package to survive, got from_id %s", pkgs[0].FromID)
		}
	})

	// Packages that were not granted by the subscription plan (purchased or
	// promotional) must survive an upgrade.
	t.Run("non-subscription packages survive", func(t *testing.T) {
		sub := seedWorkspaceSubscription(t, db)
		purchased := types.WorkspaceAIQuotaPackage{
			ID:                      uuid.New(),
			WorkspaceSubscriptionID: sub.ID,
			Workspace:               sub.Workspace,
			RegionDomain:            sub.RegionDomain,
			From:                    "purchased",
			FromID:                  uuid.NewString(),
			Total:                   5_000_000,
			Status:                  types.PackageStatusActive,
			ExpiredAt:               time.Now().Add(90 * 24 * time.Hour),
		}
		if err := db.Create(&purchased).Error; err != nil {
			t.Fatalf("failed to seed purchased package: %v", err)
		}

		grantAIQuota(t, db, sub.ID, 1_000_000, uuid.NewString(), false)
		grantAIQuota(t, db, sub.ID, 20_000_000, uuid.NewString(), true)

		pkgs := activeAIQuotaPackages(t, db, sub.ID)
		var total int64
		purchasedAlive := false
		for _, p := range pkgs {
			total += p.Total
			if p.ID == purchased.ID {
				purchasedAlive = true
			}
		}
		if !purchasedAlive {
			t.Fatal("purchased package was expired by the upgrade")
		}
		if total != 25_000_000 {
			t.Fatalf("want purchased + new plan quota 25000000, got %d", total)
		}
	})

	// Replaying the same transaction sequentially (e.g. a Stripe webhook retry)
	// must not expire the package the first run created.
	t.Run("replay is idempotent", func(t *testing.T) {
		sub := seedWorkspaceSubscription(t, db)
		fromID := uuid.NewString()
		grantAIQuota(t, db, sub.ID, 1_000_000, uuid.NewString(), false)
		grantAIQuota(t, db, sub.ID, 20_000_000, fromID, true)
		grantAIQuota(t, db, sub.ID, 20_000_000, fromID, true)

		pkgs := activeAIQuotaPackages(t, db, sub.ID)
		if len(pkgs) != 1 {
			t.Fatalf("want exactly 1 active package after replay, got %d", len(pkgs))
		}
		if pkgs[0].FromID != fromID || pkgs[0].Total != 20_000_000 {
			t.Fatalf(
				"replay corrupted the package: from_id=%s total=%d",
				pkgs[0].FromID,
				pkgs[0].Total,
			)
		}
	})

	// A later replay of an older upgrade must not expire the current package.
	t.Run("replay of older upgrade does not expire later package", func(t *testing.T) {
		sub := seedWorkspaceSubscription(t, db)
		fromA := uuid.NewString()
		fromB := uuid.NewString()
		grantAIQuota(t, db, sub.ID, 1_000_000, fromA, true)
		grantAIQuota(t, db, sub.ID, 20_000_000, fromB, true)
		grantAIQuota(t, db, sub.ID, 1_000_000, fromA, true)

		pkgs := activeAIQuotaPackages(t, db, sub.ID)
		if len(pkgs) != 1 {
			t.Fatalf("want exactly 1 active package after replaying older upgrade, got %d", len(pkgs))
		}
		if pkgs[0].FromID != fromB || pkgs[0].Total != 20_000_000 {
			t.Fatalf(
				"replay of older upgrade expired the later package: from_id=%s total=%d",
				pkgs[0].FromID,
				pkgs[0].Total,
			)
		}
	})

	// A zero-quota upgrade still needs a durable idempotency marker. Without
	// one, replaying it after a later positive grant expires that later grant.
	t.Run("replay of zero quota upgrade does not expire later package", func(t *testing.T) {
		sub := seedWorkspaceSubscription(t, db)
		fromA := uuid.NewString()
		fromB := uuid.NewString()
		grantAIQuota(t, db, sub.ID, 0, fromA, true)
		grantAIQuota(t, db, sub.ID, 20_000_000, fromB, true)
		grantAIQuota(t, db, sub.ID, 0, fromA, true)

		pkgs := activeAIQuotaPackages(t, db, sub.ID)
		if len(pkgs) != 1 {
			t.Fatalf("want exactly 1 active package after replaying zero-quota upgrade, got %d", len(pkgs))
		}
		if pkgs[0].FromID != fromB || pkgs[0].Total != 20_000_000 {
			t.Fatalf(
				"replay of zero-quota upgrade expired the later package: from_id=%s total=%d",
				pkgs[0].FromID,
				pkgs[0].Total,
			)
		}
	})
}

// concurrentGrants runs grant in parallel transactions, modeling concurrent
// deliveries of the same Stripe webhook. Eight writers keep the race window
// wide enough that a missing lock fails the test reliably, not occasionally.
func concurrentGrants(t *testing.T, db *gorm.DB, grant func(tx *gorm.DB) error) {
	t.Helper()
	const writers = 8
	start := make(chan struct{})
	errs := make(chan error, writers)
	for range writers {
		go func() {
			<-start
			errs <- db.Transaction(grant)
		}()
	}
	close(start)
	for range writers {
		if err := <-errs; err != nil {
			t.Fatalf("concurrent grant error: %v", err)
		}
	}
}

// Two concurrent deliveries of the same transaction must grant exactly one
// package. On fresh installs the from_id unique index enforces this; on tables
// created before the index (CreateTableIfNotExist skips existing tables) the
// subscription row lock alone must serialize the dedup check, which the
// index-dropped subtests verify.
func TestConcurrentReplayGrantsSinglePackage(t *testing.T) {
	db := setupWorkspacePackageTestDB(t)

	grantConcurrently := func(t *testing.T, sub *types.WorkspaceSubscription) {
		fromID := uuid.NewString()
		concurrentGrants(t, db, func(tx *gorm.DB) error {
			return AddWorkspaceSubscriptionAIQuotaPackageWithUpgrade(
				tx, sub.ID, 20_000_000, time.Now().Add(30*24*time.Hour),
				types.PKGFromWorkspaceSubscription, fromID, true,
			)
		})
		pkgs := activeAIQuotaPackages(t, db, sub.ID)
		if len(pkgs) != 1 {
			t.Fatalf("want exactly 1 active package after concurrent replay, got %d", len(pkgs))
		}
		if pkgs[0].Total != 20_000_000 {
			t.Fatalf("want quota 20000000, got %d", pkgs[0].Total)
		}
	}

	t.Run("ai quota with unique index", func(t *testing.T) {
		grantConcurrently(t, seedWorkspaceSubscription(t, db))
	})

	// The index-dropped subtests model pre-existing production tables and must
	// run after every subtest that relies on the index.
	t.Run("ai quota without unique index", func(t *testing.T) {
		err := db.Exec("DROP INDEX IF EXISTS uniq_workspace_ai_quota_package_from_id").Error
		if err != nil {
			t.Fatalf("failed to drop unique index: %v", err)
		}
		grantConcurrently(t, seedWorkspaceSubscription(t, db))
	})

	grantTrafficConcurrently := func(t *testing.T, sub *types.WorkspaceSubscription) {
		fromID := uuid.NewString()
		concurrentGrants(t, db, func(tx *gorm.DB) error {
			return AddWorkspaceSubscriptionTrafficPackage(
				tx, sub.ID, 10_240, time.Now().Add(30*24*time.Hour),
				types.WorkspaceTrafficFromWorkspaceSubscription, fromID,
			)
		})
		pkgs := activeTrafficPackages(t, db, sub.ID)
		if len(pkgs) != 1 {
			t.Fatalf("want exactly 1 active traffic package after concurrent replay, got %d", len(pkgs))
		}
	}

	t.Run("traffic with unique index", func(t *testing.T) {
		grantTrafficConcurrently(t, seedWorkspaceSubscription(t, db))
	})

	t.Run("traffic without unique index", func(t *testing.T) {
		err := db.Exec("DROP INDEX IF EXISTS uniq_workspace_traffic_from_id").Error
		if err != nil {
			t.Fatalf("failed to drop unique index: %v", err)
		}
		grantTrafficConcurrently(t, seedWorkspaceSubscription(t, db))
	})
}

func TestUpgradeTrafficPackageSemantics(t *testing.T) {
	db := setupWorkspacePackageTestDB(t)

	t.Run("upgrade grants full traffic", func(t *testing.T) {
		sub := seedWorkspaceSubscription(t, db)
		grantTraffic(t, db, sub.ID, 1_024, uuid.NewString(), false)
		grantTraffic(t, db, sub.ID, 10_240, uuid.NewString(), true)

		pkgs := activeTrafficPackages(t, db, sub.ID)
		if len(pkgs) != 1 {
			t.Fatalf("want exactly 1 active package after upgrade, got %d", len(pkgs))
		}
		wantBytes := int64(10_240) * 1024 * 1024
		if pkgs[0].TotalBytes != wantBytes {
			t.Fatalf("want full new plan traffic %d, got %d", wantBytes, pkgs[0].TotalBytes)
		}
	})

	t.Run("upgrade expires exhausted old traffic", func(t *testing.T) {
		sub := seedWorkspaceSubscription(t, db)
		oldFromID := uuid.NewString()
		grantTraffic(t, db, sub.ID, 1_024, oldFromID, false)

		var oldPackage types.WorkspaceTraffic
		if err := db.Where("from_id = ?", oldFromID).First(&oldPackage).Error; err != nil {
			t.Fatalf("failed to load old traffic package: %v", err)
		}
		if err := db.Model(&oldPackage).Updates(map[string]any{
			"status":     types.WorkspaceTrafficStatusExhausted,
			"used_bytes": oldPackage.TotalBytes,
		}).Error; err != nil {
			t.Fatalf("failed to exhaust old traffic package: %v", err)
		}

		grantTraffic(t, db, sub.ID, 10_240, uuid.NewString(), true)

		if err := db.First(&oldPackage, "id = ?", oldPackage.ID).Error; err != nil {
			t.Fatalf("failed to reload old traffic package: %v", err)
		}
		if oldPackage.Status != types.WorkspaceTrafficStatusExpired {
			t.Fatalf("want exhausted old package expired, got %s", oldPackage.Status)
		}

		ck := &Cockroach{DB: db}
		total, used, err := ck.GetWorkspaceSubscriptionTraffic(sub.Workspace, sub.RegionDomain)
		if err != nil {
			t.Fatalf("GetWorkspaceSubscriptionTraffic() error = %v", err)
		}
		wantTotal := int64(10_240) * 1024 * 1024
		if total != wantTotal || used != 0 {
			t.Fatalf(
				"want reset traffic total=%d used=0, got total=%d used=%d",
				wantTotal,
				total,
				used,
			)
		}
	})

	t.Run("replay is idempotent", func(t *testing.T) {
		sub := seedWorkspaceSubscription(t, db)
		fromID := uuid.NewString()
		grantTraffic(t, db, sub.ID, 1_024, uuid.NewString(), false)
		if !grantTraffic(t, db, sub.ID, 10_240, fromID, true).granted {
			t.Fatal("first delivery should report a new traffic grant")
		}
		if grantTraffic(t, db, sub.ID, 10_240, fromID, true).granted {
			t.Fatal("replay should not report a new traffic grant")
		}

		pkgs := activeTrafficPackages(t, db, sub.ID)
		if len(pkgs) != 1 {
			t.Fatalf("want exactly 1 active package after replay, got %d", len(pkgs))
		}
		if pkgs[0].FromID != fromID {
			t.Fatalf("replay corrupted the package: from_id=%s", pkgs[0].FromID)
		}
	})

	t.Run("replay of older upgrade does not expire later package", func(t *testing.T) {
		sub := seedWorkspaceSubscription(t, db)
		fromA := uuid.NewString()
		fromB := uuid.NewString()
		grantTraffic(t, db, sub.ID, 1_024, fromA, true)
		grantTraffic(t, db, sub.ID, 10_240, fromB, true)
		grantTraffic(t, db, sub.ID, 1_024, fromA, true)

		pkgs := activeTrafficPackages(t, db, sub.ID)
		if len(pkgs) != 1 {
			t.Fatalf("want exactly 1 active package after replaying older upgrade, got %d", len(pkgs))
		}
		if pkgs[0].FromID != fromB {
			t.Fatalf("replay of older upgrade expired the later package: from_id=%s", pkgs[0].FromID)
		}
	})

	t.Run("zero traffic upgrade expires old package and grants nothing", func(t *testing.T) {
		sub := seedWorkspaceSubscription(t, db)
		grantTraffic(t, db, sub.ID, 1_024, uuid.NewString(), false)
		outcome := grantTraffic(t, db, sub.ID, 0, uuid.NewString(), true)
		if outcome.granted {
			t.Fatal("zero-traffic upgrade should not report a new traffic grant")
		}
		if !outcome.shouldSuspend {
			t.Fatal("zero-traffic upgrade without surviving traffic should request suspension")
		}

		pkgs := activeTrafficPackages(t, db, sub.ID)
		if len(pkgs) != 0 {
			t.Fatalf("want no active subscription traffic after zero-traffic upgrade, got %d", len(pkgs))
		}
		if err := db.First(sub, "id = ?", sub.ID).Error; err != nil {
			t.Fatalf("failed to reload subscription: %v", err)
		}
		if sub.TrafficStatus != types.WorkspaceTrafficStatusUsedUp {
			t.Fatalf("want traffic status used_up, got %s", sub.TrafficStatus)
		}
	})

	t.Run("zero traffic upgrade preserves surviving promotional traffic", func(t *testing.T) {
		sub := seedWorkspaceSubscription(t, db)
		grantTraffic(t, db, sub.ID, 1_024, uuid.NewString(), false)
		promotional := &types.WorkspaceTraffic{
			ID:                      uuid.New(),
			WorkspaceSubscriptionID: sub.ID,
			Workspace:               sub.Workspace,
			RegionDomain:            sub.RegionDomain,
			From:                    types.WorkspaceTrafficFrom("promotion"),
			FromID:                  uuid.NewString(),
			TotalBytes:              512 * 1024 * 1024,
			Status:                  types.WorkspaceTrafficStatusActive,
			ExpiredAt:               time.Now().Add(7 * 24 * time.Hour),
		}
		if err := db.Create(promotional).Error; err != nil {
			t.Fatalf("failed to seed promotional traffic: %v", err)
		}

		outcome := grantTraffic(t, db, sub.ID, 0, uuid.NewString(), true)
		if outcome.granted || outcome.shouldSuspend {
			t.Fatalf("want surviving promotional traffic to stay usable, got %+v", outcome)
		}
		if err := db.First(sub, "id = ?", sub.ID).Error; err != nil {
			t.Fatalf("failed to reload subscription: %v", err)
		}
		if sub.TrafficStatus != types.WorkspaceTrafficStatusActive {
			t.Fatalf("want traffic status active, got %s", sub.TrafficStatus)
		}
	})

	t.Run("replay of zero traffic upgrade does not expire later package", func(t *testing.T) {
		sub := seedWorkspaceSubscription(t, db)
		fromA := uuid.NewString()
		fromB := uuid.NewString()
		grantTraffic(t, db, sub.ID, 0, fromA, true)
		grantTraffic(t, db, sub.ID, 10_240, fromB, true)
		grantTraffic(t, db, sub.ID, 0, fromA, true)

		pkgs := activeTrafficPackages(t, db, sub.ID)
		if len(pkgs) != 1 {
			t.Fatalf("want exactly 1 active package after replaying zero-traffic upgrade, got %d", len(pkgs))
		}
		if pkgs[0].FromID != fromB {
			t.Fatalf("replay of zero-traffic upgrade expired the later package: from_id=%s", pkgs[0].FromID)
		}
	})
}

func TestEnsureWorkspacePackageFromIDIndexes(t *testing.T) {
	db := setupWorkspacePackageTestDB(t)
	var duplicateTrafficID, duplicateAIQuotaID uuid.UUID

	t.Run("fresh table has unique indexes", func(t *testing.T) {
		if !db.Migrator().HasIndex(&types.WorkspaceTraffic{}, "uniq_workspace_traffic_from_id") {
			t.Fatal("want unique traffic from_id index on a fresh table")
		}
		if !db.Migrator().HasIndex(&types.WorkspaceAIQuotaPackage{}, "uniq_workspace_ai_quota_package_from_id") {
			t.Fatal("want unique AI from_id index on a fresh table")
		}
	})

	t.Run("existing table without duplicates gets unique indexes", func(t *testing.T) {
		if err := db.Exec("DROP INDEX IF EXISTS uniq_workspace_traffic_from_id").Error; err != nil {
			t.Fatalf("drop traffic unique index: %v", err)
		}
		if err := db.Exec("DROP INDEX IF EXISTS uniq_workspace_ai_quota_package_from_id").Error; err != nil {
			t.Fatalf("drop AI unique index: %v", err)
		}
		if err := ensureWorkspacePackageFromIDIndexes(db); err != nil {
			t.Fatalf("ensureWorkspacePackageFromIDIndexes() error = %v", err)
		}
		if !db.Migrator().HasIndex(&types.WorkspaceTraffic{}, "uniq_workspace_traffic_from_id") {
			t.Fatal("want unique traffic from_id index after ensure")
		}
		if !db.Migrator().HasIndex(&types.WorkspaceAIQuotaPackage{}, "uniq_workspace_ai_quota_package_from_id") {
			t.Fatal("want unique AI from_id index after ensure")
		}
	})

	t.Run("duplicates fall back to lookup indexes", func(t *testing.T) {
		if err := db.Exec("DROP INDEX IF EXISTS uniq_workspace_traffic_from_id").Error; err != nil {
			t.Fatalf("drop traffic unique index: %v", err)
		}
		if err := db.Exec("DROP INDEX IF EXISTS uniq_workspace_ai_quota_package_from_id").Error; err != nil {
			t.Fatalf("drop AI unique index: %v", err)
		}

		sub := seedWorkspaceSubscription(t, db)
		fromID := uuid.NewString()
		now := time.Now()
		for i := range 2 {
			traffic := types.WorkspaceTraffic{
				ID:                      uuid.New(),
				WorkspaceSubscriptionID: sub.ID,
				Workspace:               sub.Workspace,
				RegionDomain:            sub.RegionDomain,
				From:                    types.WorkspaceTrafficFromWorkspaceSubscription,
				FromID:                  fromID,
				TotalBytes:              1024,
				Status:                  types.WorkspaceTrafficStatusActive,
				ExpiredAt:               now.Add(24 * time.Hour),
			}
			if err := db.Create(&traffic).Error; err != nil {
				t.Fatalf("seed duplicate traffic: %v", err)
			}
			if i == 0 {
				duplicateTrafficID = traffic.ID
			}
			ai := types.WorkspaceAIQuotaPackage{
				ID:                      uuid.New(),
				WorkspaceSubscriptionID: sub.ID,
				Workspace:               sub.Workspace,
				RegionDomain:            sub.RegionDomain,
				From:                    types.PKGFromWorkspaceSubscription,
				FromID:                  fromID,
				Total:                   1000,
				Status:                  types.PackageStatusActive,
				ExpiredAt:               now.Add(24 * time.Hour),
			}
			if err := db.Create(&ai).Error; err != nil {
				t.Fatalf("seed duplicate AI quota: %v", err)
			}
			if i == 0 {
				duplicateAIQuotaID = ai.ID
			}
		}

		if err := ensureWorkspacePackageFromIDIndexes(db); err != nil {
			t.Fatalf("ensureWorkspacePackageFromIDIndexes() error = %v", err)
		}
		if db.Migrator().HasIndex(&types.WorkspaceTraffic{}, "uniq_workspace_traffic_from_id") {
			t.Fatal("unique traffic index should not exist when from_id has duplicates")
		}
		if !db.Migrator().HasIndex(&types.WorkspaceTraffic{}, "idx_workspace_traffic_from_id") {
			t.Fatal("want traffic lookup index after duplicate fallback")
		}
		if db.Migrator().HasIndex(&types.WorkspaceAIQuotaPackage{}, "uniq_workspace_ai_quota_package_from_id") {
			t.Fatal("unique AI index should not exist when from_id has duplicates")
		}
		if !db.Migrator().HasIndex(&types.WorkspaceAIQuotaPackage{}, "idx_workspace_ai_quota_package_from_id") {
			t.Fatal("want AI lookup index after duplicate fallback")
		}
	})

	t.Run("cleaned duplicates promote lookup indexes", func(t *testing.T) {
		if err := db.Delete(&types.WorkspaceTraffic{}, "id = ?", duplicateTrafficID).
			Error; err != nil {
			t.Fatalf("delete duplicate traffic package: %v", err)
		}
		if err := db.Delete(&types.WorkspaceAIQuotaPackage{}, "id = ?", duplicateAIQuotaID).
			Error; err != nil {
			t.Fatalf("delete duplicate AI quota package: %v", err)
		}

		if err := ensureWorkspacePackageFromIDIndexes(db); err != nil {
			t.Fatalf("ensureWorkspacePackageFromIDIndexes() error = %v", err)
		}
		if !db.Migrator().
			HasIndex(&types.WorkspaceTraffic{}, "uniq_workspace_traffic_from_id") {
			t.Fatal("want traffic lookup index promoted to unique after cleanup")
		}
		if db.Migrator().
			HasIndex(&types.WorkspaceTraffic{}, "idx_workspace_traffic_from_id") {
			t.Fatal("traffic lookup index should be removed after promotion")
		}
		if !db.Migrator().
			HasIndex(&types.WorkspaceAIQuotaPackage{}, "uniq_workspace_ai_quota_package_from_id") {
			t.Fatal("want AI lookup index promoted to unique after cleanup")
		}
		if db.Migrator().
			HasIndex(&types.WorkspaceAIQuotaPackage{}, "idx_workspace_ai_quota_package_from_id") {
			t.Fatal("AI lookup index should be removed after promotion")
		}
	})
}

type testSQLStateError string

func (e testSQLStateError) Error() string {
	return string(e)
}

func (e testSQLStateError) SQLState() string {
	return string(e)
}

func TestIsUniqueViolation(t *testing.T) {
	// TranslateError is what fires in production: it swaps the driver error for
	// the sentinel, which carries no SQLState.
	if !isUniqueViolation(fmt.Errorf("create index: %w", gorm.ErrDuplicatedKey)) {
		t.Fatal("expected translated duplicate-key error to allow lookup-index fallback")
	}
	if !isUniqueViolation(testSQLStateError("23505")) {
		t.Fatal("expected duplicate-data SQLSTATE to allow lookup-index fallback")
	}
	if isUniqueViolation(testSQLStateError("40001")) {
		t.Fatal("retryable schema error must not allow lookup-index fallback")
	}
}
