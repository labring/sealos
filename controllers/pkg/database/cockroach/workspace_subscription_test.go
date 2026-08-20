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
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
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

	t.Run("traffic without unique index", func(t *testing.T) {
		err := db.Exec("DROP INDEX IF EXISTS uniq_workspace_traffic_from_id").Error
		if err != nil {
			t.Fatalf("failed to drop unique index: %v", err)
		}
		sub := seedWorkspaceSubscription(t, db)
		fromID := uuid.NewString()
		concurrentGrants(t, db, func(tx *gorm.DB) error {
			return AddWorkspaceSubscriptionTrafficPackage(
				tx, sub.ID, 10_240, time.Now().Add(30*24*time.Hour),
				types.WorkspaceTrafficFromWorkspaceSubscription, fromID,
			)
		})
		var pkgs []types.WorkspaceTraffic
		err = db.Where("workspace_subscription_id = ? AND status = ?",
			sub.ID, types.WorkspaceTrafficStatusActive).Find(&pkgs).Error
		if err != nil {
			t.Fatalf("failed to list traffic packages: %v", err)
		}
		if len(pkgs) != 1 {
			t.Fatalf("want exactly 1 active traffic package after concurrent replay, got %d", len(pkgs))
		}
	})
}
