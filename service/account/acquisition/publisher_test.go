package acquisition

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestAcquisitionConfig(t *testing.T) {
	lookup := func(values map[string]string) func(string) string {
		return func(key string) string { return values[key] }
	}
	if cfg, err := ConfigFromEnv(lookup(nil), "region", "usd"); err != nil || cfg != nil {
		t.Fatalf("disabled config = %v, %v", cfg, err)
	}
	for _, endpoint := range []string{"http://remote.example/api/analytics/lifecycle", "https://user:secret@example/api/analytics/lifecycle", "https://example/api/wrong", "https://example/api/analytics/lifecycle?secret=bad"} {
		_, err := ConfigFromEnv(
			lookup(
				map[string]string{
					"ACQUISITION_ANALYTICS_URL": endpoint,
					"ACQUISITION_INGEST_SECRET": "test-secret",
					"ACQUISITION_REALM":         "global",
				},
			),
			"region",
			"USD",
		)
		if err == nil {
			t.Fatalf("unsafe endpoint accepted: %s", endpoint)
		}
	}
	cfg, err := ConfigFromEnv(
		lookup(
			map[string]string{
				"ACQUISITION_ANALYTICS_URL": "https://collector.example/api/analytics/lifecycle",
				"ACQUISITION_INGEST_SECRET": "test-secret",
				"ACQUISITION_REALM":         "china",
			},
		),
		"region",
		"cny",
	)
	if err != nil || cfg.Currency != "CNY" || cfg.Realm != "china" {
		t.Fatalf("valid config = %+v, %v", cfg, err)
	}
}

func TestAcquisitionBillingFactEligibility(t *testing.T) {
	now := time.Now().UTC()
	fact := paymentFact{
		ID:        "payment",
		UserUID:   uuid.NewString(),
		CreatedAt: now.Add(-time.Hour),
		Method:    "wechat",
		Amount:    12_500_000,
		TradeNO:   "verified-trade",
		Status:    "PAID",
	}
	cfg := Config{Realm: "china", Currency: "CNY"}
	event, ok := billingEvent(fact, cfg, now)
	if !ok || event.EventName != "topup_success" || event.Properties["value"] != 12.5 ||
		!event.OccurredAt.Equal(now) {
		t.Fatalf("legacy domestic payment = %+v, %v", event, ok)
	}
	same, _ := billingEvent(fact, cfg, now.Add(time.Minute))
	if event.EventID != same.EventID {
		t.Fatal("event ID changed across repeated observation")
	}
	for _, change := range []func(*paymentFact){
		func(f *paymentFact) { f.UserUID = "forged" }, func(f *paymentFact) { f.UserUID = uuid.Nil.String() },
		func(f *paymentFact) { f.Amount = 0 }, func(f *paymentFact) { f.Status = "PENDING" },
		func(f *paymentFact) { f.Method = "gift" }, func(f *paymentFact) { f.Method = "balance" },
		func(f *paymentFact) { f.TradeNO = "" }, func(f *paymentFact) { f.Type = "ADMIN_REWARD" },
		func(f *paymentFact) { f.TransactionFrom = "admin" },
		func(f *paymentFact) { f.TransactionFrom = "referral" },
		func(f *paymentFact) { f.Method = "corporate" },
	} {
		invalid := fact
		change(&invalid)
		if _, allowed := billingEvent(invalid, cfg, now); allowed {
			t.Fatalf("invalid fact accepted: %+v", invalid)
		}
	}
	fact.Type, fact.Method, fact.Workspace = "SUBSCRIPTION", "balance", "paid-team-workspace"
	event, ok = billingEvent(fact, cfg, now)
	if !ok || event.EventName != "subscribe_success" ||
		event.WorkspaceID != "paid-team-workspace" ||
		event.SubjectID != fact.UserUID {
		t.Fatalf("workspace subscription = %+v, %v", event, ok)
	}
}

func acquisitionTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	if testing.Short() {
		t.Skip("requires temporary PostgreSQL container")
	}
	ctx := context.Background()
	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: testcontainers.ContainerRequest{
			Image:        "postgres:16",
			ExposedPorts: []string{"5432/tcp"},
			Env: map[string]string{
				"POSTGRES_PASSWORD": "acquisition-test-only",
				"POSTGRES_DB":       "acquisition",
			},
			WaitingFor: wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(90 * time.Second),
		},
		Started: true,
	})
	if err != nil {
		t.Fatalf("start isolated test database: %v", err)
	}
	t.Cleanup(func() { _ = container.Terminate(ctx) })
	host, err := container.Host(ctx)
	if err != nil {
		t.Fatal(err)
	}
	port, err := container.MappedPort(ctx, "5432/tcp")
	if err != nil {
		t.Fatal(err)
	}
	dsn := fmt.Sprintf(
		"host=%s port=%s user=postgres password=acquisition-test-only dbname=acquisition sslmode=disable",
		host,
		port.Port(),
	)
	var db *gorm.DB
	for range 30 {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err == nil {
			break
		}
		time.Sleep(100 * time.Millisecond)
	}
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })
	for _, statement := range []string{
		`CREATE TABLE "WorkspaceSubscription" (id uuid PRIMARY KEY, workspace text NOT NULL)`,
		`CREATE TABLE "WorkspaceSubscriptionTransaction" (id text PRIMARY KEY, pay_id text, "from" text, created_at timestamptz)`,
		`CREATE TABLE "Payment" (id text PRIMARY KEY, "userUid" uuid, "regionUid" uuid NOT NULL, created_at timestamptz NOT NULL, method text, amount bigint, trade_no text UNIQUE, type text, status text, workspace_subscription_id uuid)`,
	} {
		if err := db.Exec(statement).Error; err != nil {
			t.Fatal(err)
		}
	}
	return db
}

func TestAcquisitionCommittedBillingOutbox(t *testing.T) {
	db := acquisitionTestDB(t)
	ctx := context.Background()
	regionID, userID, workspaceID := uuid.NewString(), uuid.NewString(), uuid.NewString()
	now := time.Now().UTC()
	insert := func(id, status, kind, method string, created time.Time, amount int64, workspace any) {
		t.Helper()
		if err := db.Exec(
			`INSERT INTO "Payment" (id,"userUid","regionUid",created_at,method,amount,trade_no,type,status,workspace_subscription_id) VALUES (?,?,?,?,?,?,?,?,?,?)`,
			id,
			userID,
			regionID,
			created,
			method,
			amount,
			"trade-"+id,
			kind,
			status,
			workspace,
		).Error; err != nil {
			t.Fatal(err)
		}
	}
	insert("historical", "PAID", "", "wechat", now.Add(-time.Hour), 5_000_000, nil)
	// A pending row already exists at activation, but is not a historical paid fact.
	insert("pending", "PENDING", "ACCOUNT_RECHARGE", "stripe", now.Add(-time.Hour), 1_000_000, nil)
	var lock sync.Mutex
	var received []lifecycleEvent
	accept := false
	receiver := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/analytics/lifecycle" ||
			r.Header.Get("Authorization") != "Bearer test-shared-secret" {
			t.Errorf("unexpected collector request")
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		var event lifecycleEvent
		if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
			t.Error(err)
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		lock.Lock()
		received = append(received, event)
		accepted := accept
		lock.Unlock()
		if accepted {
			w.WriteHeader(http.StatusAccepted)
		} else {
			w.WriteHeader(http.StatusServiceUnavailable)
		}
	}))
	defer receiver.Close()
	cfg := Config{
		URL:      receiver.URL + "/api/analytics/lifecycle",
		Secret:   "test-shared-secret",
		Realm:    "china",
		RegionID: regionID,
		Currency: "CNY",
	}
	publisher := NewPublisher(db, cfg)
	publisher.now = func() time.Time { return now }
	if err := publisher.Initialize(ctx); err != nil {
		t.Fatal(err)
	}
	var prematurelySeeded int64
	if err := db.Model(&delivery{}).
		Where("payment_id = ?", "pending").
		Count(&prematurelySeeded).
		Error; err != nil {
		t.Fatal(err)
	}
	if prematurelySeeded != 0 {
		t.Fatal("pending payment was incorrectly classified as historical")
	}
	// A controller can settle after activation using an older order timestamp.
	insert("late-settlement", "PAID", "", "wechat", now.Add(-2*time.Hour), 12_500_000, nil)
	insert("free", "PAID", "SUBSCRIPTION", "balance", now, 0, nil)
	if err := db.Exec(
		`INSERT INTO "WorkspaceSubscription" (id,workspace) VALUES (?,?)`,
		workspaceID,
		"workspace-a",
	).Error; err != nil {
		t.Fatal(err)
	}
	insert("subscription", "PAID", "SUBSCRIPTION", "balance", now, 2_000_000, workspaceID)
	insert("admin-grant", "PAID", "SUBSCRIPTION", "balance", now, 2_000_000, workspaceID)
	if err := db.Exec(
		`INSERT INTO "WorkspaceSubscriptionTransaction" (id,pay_id,"from",created_at) VALUES ('admin-transaction','admin-grant','admin',?)`,
		now,
	).Error; err != nil {
		t.Fatal(err)
	}
	if err := publisher.Capture(ctx); err != nil {
		t.Fatal(err)
	}
	if err := publisher.Capture(ctx); err != nil {
		t.Fatal(err)
	}
	var rows []delivery
	if err := db.Order("payment_id").Find(&rows).Error; err != nil {
		t.Fatal(err)
	}
	if len(rows) != 5 {
		t.Fatalf(
			"ledger rows=%d, want historical + 2 real + ignored free + ignored admin",
			len(rows),
		)
	}
	if err := publisher.Flush(ctx); err != nil {
		t.Fatal(err)
	}
	lock.Lock()
	if len(received) != 2 {
		t.Fatalf("first attempts=%d", len(received))
	}
	before := append([]lifecycleEvent(nil), received...)
	accept = true
	lock.Unlock()
	now = now.Add(2 * time.Minute)
	// Two replicas share SQL delivery ownership; neither may send the other's locked row.
	peer := NewPublisher(db, cfg)
	peer.now = publisher.now
	results := make(chan error, 2)
	go func() { results <- publisher.Flush(ctx) }()
	go func() { results <- peer.Flush(ctx) }()
	for range 2 {
		if err := <-results; err != nil {
			t.Fatal(err)
		}
	}
	if err := publisher.Flush(ctx); err != nil {
		t.Fatal(err)
	}
	lock.Lock()
	after := append([]lifecycleEvent(nil), received...)
	lock.Unlock()
	if len(after) != 4 || !reflect.DeepEqual(before, after[2:]) {
		t.Fatalf("retry mutated or duplicated payloads: %v", after)
	}
	for _, event := range after {
		if event.SubjectID != userID || event.Realm != "china" ||
			event.Properties["currency"] != "CNY" {
			t.Fatalf("identity/currency changed: %+v", event)
		}
		if event.EventName == "subscribe_success" && event.WorkspaceID != "workspace-a" {
			t.Fatalf("payer and workspace lost: %+v", event)
		}
		if strings.Contains(event.TransactionID, "historical") {
			t.Fatal("historical payment replayed")
		}
	}
	// Restart keeps activation and delivery state; the pending row becomes a new paid fact.
	restarted := NewPublisher(db, cfg)
	restarted.now = publisher.now
	if err := restarted.Initialize(ctx); err != nil {
		t.Fatal(err)
	}
	if err := db.Exec(`UPDATE "Payment" SET status='PAID' WHERE id='pending'`).Error; err != nil {
		t.Fatal(err)
	}
	if err := restarted.Capture(ctx); err != nil {
		t.Fatal(err)
	}
	if err := restarted.Flush(ctx); err != nil {
		t.Fatal(err)
	}
	if err := restarted.Flush(ctx); err != nil {
		t.Fatal(err)
	}
	lock.Lock()
	count := len(received)
	lock.Unlock()
	if count != 5 {
		t.Fatalf("restart/pending transition lost or duplicated events: %d", count)
	}
	var delivered int64
	if err := db.Model(&delivery{}).Where("state='delivered'").Count(&delivered).Error; err != nil {
		t.Fatal(err)
	}
	if delivered != 3 {
		t.Fatalf("delivered rows=%d, want 3", delivered)
	}
}
