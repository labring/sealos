package mongo

import (
	"context"
	"fmt"
	"net"
	"strings"
	"testing"
	"time"

	"github.com/labring/sealos/controllers/pkg/resources"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func explainBillingFind(ctx context.Context, account *mongoDB, filter bson.D) (bson.M, error) {
	var explain bson.M
	err := account.Client.Database(account.AccountDB).RunCommand(ctx, bson.D{
		{Key: "explain", Value: bson.D{
			{Key: "find", Value: account.BillingConn},
			{Key: "filter", Value: filter},
		}},
		{Key: "verbosity", Value: "executionStats"},
	}).Decode(&explain)
	return explain, err
}

func TestBillingPersistenceWithMongoRuntime(t *testing.T) {
	testcontainers.SkipIfProviderIsNotHealthy(t)
	ctx := context.Background()
	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: testcontainers.ContainerRequest{
			Image:        "mongo:7.0",
			ExposedPorts: []string{"27017/tcp"},
			WaitingFor: wait.ForListeningPort("27017/tcp").
				WithStartupTimeout(2 * time.Minute),
		},
		Started: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := container.Terminate(ctx); err != nil {
			t.Errorf("terminate MongoDB: %v", err)
		}
	})
	host, err := container.Host(ctx)
	if err != nil {
		t.Fatal(err)
	}
	port, err := container.MappedPort(ctx, "27017/tcp")
	if err != nil {
		t.Fatal(err)
	}
	account, err := NewMongoInterface(ctx, "mongodb://"+net.JoinHostPort(host, port.Port()))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := account.Disconnect(ctx); err != nil {
			t.Errorf("disconnect MongoDB: %v", err)
		}
	})
	mongoAccount, ok := account.(*mongoDB)
	if !ok {
		t.Fatalf("account type = %T", account)
	}
	// Simulate an existing production collection so initialization must add
	// indexes during an upgrade.
	if err := mongoAccount.Client.Database(mongoAccount.AccountDB).
		CreateCollection(ctx, mongoAccount.BillingConn); err != nil {
		t.Fatal(err)
	}
	if err := account.CreateBillingIfNotExist(); err != nil {
		t.Fatal(err)
	}
	if err := account.CreateBillingIfNotExist(); err != nil {
		t.Fatalf("repeat index initialization: %v", err)
	}

	end := time.Date(2026, time.July, 7, 10, 0, 0, 0, time.UTC)
	billing := &resources.Billing{
		Time: end, OrderID: "stable-order", Owner: "owner", Namespace: "ns-owner",
		Type: Consumption, AppType: 1, Amount: 100, Status: resources.Unsettled,
	}
	if err := account.SaveBillings(billing); err != nil {
		t.Fatal(err)
	}
	billing.Status = resources.Settled
	if err := account.SaveBillings(billing); err != nil {
		t.Fatal(err)
	}

	indexSpecs, err := mongoAccount.getBillingCollection().Indexes().ListSpecifications(ctx)
	if err != nil {
		t.Fatal(err)
	}
	const workspaceConsumptionIndexName = "owner_1_status_1_time_1"
	hasWorkspaceConsumptionIndex := false
	for _, indexSpec := range indexSpecs {
		if indexSpec.Name == workspaceConsumptionIndexName {
			hasWorkspaceConsumptionIndex = true
			break
		}
	}
	if !hasWorkspaceConsumptionIndex {
		t.Fatalf("billing indexes do not include %q", workspaceConsumptionIndexName)
	}
	monitorTime := end.Add(-time.Hour)
	namespaces, err := account.GetTimeUsedNamespaceList(monitorTime, end)
	if err != nil || len(namespaces) != 0 {
		t.Fatalf("missing monitor collection namespaces=%v err=%v", namespaces, err)
	}
	count, err := mongoAccount.getBillingCollection().CountDocuments(ctx, bson.M{
		"owner": "owner", "order_id": "stable-order",
	})
	if err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("billing count = %d", count)
	}
	var stored resources.Billing
	if err := mongoAccount.getBillingCollection().FindOne(ctx, bson.M{
		"owner": "owner", "order_id": "stable-order",
	}).Decode(&stored); err != nil {
		t.Fatal(err)
	}
	if stored.Status != resources.Unsettled {
		t.Fatalf("stored status = %v", stored.Status)
	}
	recoveryBillings := []*resources.Billing{
		{
			Time: end, OrderID: "bh_recover", Owner: "recover-owner", Namespace: "ns-recover",
			Type: Consumption, AppType: 1, Amount: 50, Status: resources.Unsettled,
		},
		{
			Time: end, OrderID: "bh_settled", Owner: "settled-owner", Namespace: "ns-settled",
			Type: Consumption, AppType: 1, Amount: 50, Status: resources.Settled,
		},
		{
			Time: end, OrderID: "legacy-random", Owner: "legacy-owner", Namespace: "ns-legacy",
			Type: Consumption, AppType: 1, Amount: 50, Status: resources.Unsettled,
		},
		{
			Time:      end.Add(time.Hour),
			OrderID:   "bh_other-hour",
			Owner:     "other-owner",
			Namespace: "ns-other",
			Type:      Consumption, AppType: 1, Amount: 50, Status: resources.Unsettled,
		},
	}
	if err := account.SaveBillings(recoveryBillings...); err != nil {
		t.Fatal(err)
	}
	unsettled, err := account.GetUnsettledBillingsAt(end)
	if err != nil {
		t.Fatal(err)
	}
	if len(unsettled) != 1 || len(unsettled["recover-owner"]) != 1 ||
		unsettled["recover-owner"][0].OrderID != "bh_recover" {
		t.Fatalf("unsettled billings = %#v", unsettled)
	}

	if err := account.SaveBillingCheckpoint(end); err != nil {
		t.Fatal(err)
	}
	checkpoint, exists, err := account.GetBillingCheckpoint()
	if err != nil || !exists || !checkpoint.Equal(end) {
		t.Fatalf("checkpoint=%v exists=%v err=%v", checkpoint, exists, err)
	}
}

func TestBillingQueriesUseIndexesWithMongoRuntime(t *testing.T) {
	testcontainers.SkipIfProviderIsNotHealthy(t)
	ctx := context.Background()
	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: testcontainers.ContainerRequest{
			Image:        "mongo:7.0",
			ExposedPorts: []string{"27017/tcp"},
			WaitingFor: wait.ForListeningPort("27017/tcp").
				WithStartupTimeout(2 * time.Minute),
		},
		Started: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := container.Terminate(ctx); err != nil {
			t.Errorf("terminate MongoDB: %v", err)
		}
	})
	host, err := container.Host(ctx)
	if err != nil {
		t.Fatal(err)
	}
	port, err := container.MappedPort(ctx, "27017/tcp")
	if err != nil {
		t.Fatal(err)
	}
	account, err := NewMongoInterface(ctx, "mongodb://"+net.JoinHostPort(host, port.Port()))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := account.Disconnect(ctx); err != nil {
			t.Errorf("disconnect MongoDB: %v", err)
		}
	})
	if err := account.CreateBillingIfNotExist(); err != nil {
		t.Fatal(err)
	}

	mongoAccount, ok := account.(*mongoDB)
	if !ok {
		t.Fatalf("account type = %T", account)
	}
	end := time.Date(2026, time.July, 7, 10, 0, 0, 0, time.UTC)
	documents := make([]any, 0, 50000)
	for i := 0; i < 50000; i++ {
		owner := "owner-other"
		billingTime := end.Add(time.Duration(i%24) * time.Hour)
		status := resources.Settled
		if i%1000 == 0 {
			owner = "owner-target"
			billingTime = end
			status = resources.Unsettled
		}
		documents = append(documents, &resources.Billing{
			Time:      billingTime,
			OrderID:   fmt.Sprintf("bh_%05d", i),
			Type:      Consumption,
			Namespace: "ns-owner",
			AppType:   1,
			Amount:    1,
			Owner:     owner,
			Status:    status,
		})
	}
	if _, err := mongoAccount.getBillingCollection().InsertMany(ctx, documents); err != nil {
		t.Fatal(err)
	}

	ownerFilter := bson.D{
		{Key: "owner", Value: bson.M{"$in": []string{"owner-target"}}},
		{Key: "time", Value: end},
		{Key: "type", Value: Consumption},
		{Key: "app_type", Value: bson.M{"$nin": []int{int(resources.AppType[resources.CVM]), int(resources.AppType[resources.LLMToken])}}},
	}
	unsettledFilter := bson.D{
		{Key: "time", Value: end},
		{Key: "status", Value: resources.Unsettled},
		{Key: "type", Value: Consumption},
		{Key: "order_id", Value: primitive.Regex{Pattern: "^bh_"}},
		{Key: "app_type", Value: bson.M{"$nin": []int{int(resources.AppType[resources.CVM]), int(resources.AppType[resources.LLMToken])}}},
	}
	for name, filter := range map[string]bson.D{
		"owner billing lookup":      ownerFilter,
		"unsettled recovery lookup": unsettledFilter,
	} {
		explain, err := explainBillingFind(ctx, mongoAccount, filter)
		if err != nil {
			t.Fatalf("%s explain: %v", name, err)
		}
		plan := fmt.Sprint(explain["queryPlanner"])
		if !strings.Contains(plan, "IXSCAN") {
			t.Fatalf("%s did not use an index: %s", name, plan)
		}
		stats := fmt.Sprint(explain["executionStats"])
		t.Logf("%s: %s", name, stats)
	}
}

func TestStableBillingOrderID(t *testing.T) {
	end := time.Date(2026, time.July, 7, 10, 0, 0, 0, time.UTC)
	first := stableBillingOrderID("owner", end, "ns-owner", 1, "app")
	second := stableBillingOrderID("owner", end, "ns-owner", 1, "app")
	if first != second {
		t.Fatalf("IDs differ: %q %q", first, second)
	}
	if first == stableBillingOrderID("owner", end.Add(time.Hour), "ns-owner", 1, "app") {
		t.Fatal("different billing windows share an ID")
	}
}

func TestGroupMonitorRecordsByOwner(t *testing.T) {
	records := []resources.Monitor{
		{Category: "ns-a", Name: "a-1"},
		{Category: "ns-b", Name: "b-1"},
		{Category: "ns-a", Name: "a-2"},
		{Category: "unmapped", Name: "ignored"},
	}
	grouped := groupMonitorRecordsByOwner(records, map[string]string{
		"ns-a": "owner-a",
		"ns-b": "owner-b",
	})
	if len(grouped) != 2 || len(grouped["owner-a"]) != 2 || len(grouped["owner-b"]) != 1 {
		t.Fatalf("grouped records = %#v", grouped)
	}
}
