package dao

import (
	"context"
	"fmt"
	"net"
	"testing"
	"time"

	"github.com/labring/sealos/controllers/pkg/resources"
	"github.com/labring/sealos/service/account/helper"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	workspaceConsumptionTestOwner        = "workspace-consumption-test-owner"
	workspaceConsumptionTestDB           = "workspace-consumption-test"
	workspaceConsumptionTestColl         = "billing"
	workspaceConsumptionBenchmarkRecords = 10000
)

func newWorkspaceConsumptionMongo(tb testing.TB) (*MongoDB, context.Context) {
	tb.Helper()
	requireWorkspaceConsumptionDocker(tb)

	ctx := context.Background()
	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: testcontainers.ContainerRequest{
			Image:        "mongo:4.4.29",
			ExposedPorts: []string{"27017/tcp"},
			WaitingFor: wait.ForListeningPort("27017/tcp").
				WithStartupTimeout(2 * time.Minute),
		},
		Started: true,
	})
	if err != nil {
		tb.Fatalf("start MongoDB container: %v", err)
	}
	tb.Cleanup(func() {
		if err := container.Terminate(ctx); err != nil {
			tb.Errorf("terminate MongoDB container: %v", err)
		}
	})

	host, err := container.Host(ctx)
	if err != nil {
		tb.Fatalf("get MongoDB container host: %v", err)
	}
	port, err := container.MappedPort(ctx, "27017/tcp")
	if err != nil {
		tb.Fatalf("get MongoDB container port: %v", err)
	}
	client, err := mongo.Connect(
		ctx,
		options.Client().ApplyURI("mongodb://"+net.JoinHostPort(host, port.Port())),
	)
	if err != nil {
		tb.Fatalf("connect MongoDB client: %v", err)
	}
	if err := client.Ping(ctx, nil); err != nil {
		_ = client.Disconnect(ctx)
		tb.Fatalf("ping MongoDB: %v", err)
	}
	tb.Cleanup(func() {
		if err := client.Disconnect(ctx); err != nil {
			tb.Errorf("disconnect MongoDB client: %v", err)
		}
	})

	mongoDB := &MongoDB{
		Client:        client,
		AccountDBName: workspaceConsumptionTestDB,
		BillingConn:   workspaceConsumptionTestColl,
	}
	if _, err := mongoDB.getBillingCollection().Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "owner", Value: 1},
			{Key: "status", Value: 1},
			{Key: "time", Value: 1},
		},
	}); err != nil {
		tb.Fatalf("create billing query index: %v", err)
	}

	return mongoDB, ctx
}

func requireWorkspaceConsumptionDocker(tb testing.TB) {
	tb.Helper()
	defer func() {
		if r := recover(); r != nil {
			tb.Fatalf("recovered from panic while checking Docker: %v", r)
		}
	}()

	ctx := context.Background()
	provider, err := testcontainers.ProviderDocker.GetProvider()
	if err != nil {
		tb.Fatalf("get Docker provider: %v", err)
	}
	defer provider.Close()
	if err := provider.Health(ctx); err != nil {
		tb.Fatalf("check Docker health: %v", err)
	}
}

func TestGetWorkspaceConsumptionAmountWithMongoRuntime(t *testing.T) {
	mongoDB, ctx := newWorkspaceConsumptionMongo(t)
	startTime := time.Date(2026, time.January, 1, 0, 0, 0, 0, time.UTC)
	endTime := time.Date(2026, time.January, 2, 0, 0, 0, 0, time.UTC)

	appCosts := []resources.AppCost{
		{Name: "app-a", Amount: 30},
		{Name: "app-b", Amount: 5},
	}
	documents := []any{
		resources.Billing{
			Time: startTime, OrderID: "nested-at-start", Type: resources.Consumption,
			Namespace: "ns-a", AppCosts: appCosts, AppType: resources.AppType[resources.APP],
			Amount: 100, Owner: workspaceConsumptionTestOwner, Status: resources.Settled,
		},
		resources.Billing{
			Time: endTime, OrderID: "nested-at-end", Type: resources.Consumption,
			Namespace: "ns-a", AppType: resources.AppType[resources.APP], Amount: 50,
			Owner: workspaceConsumptionTestOwner, Status: resources.Settled,
		},
		resources.Billing{
			Time: endTime, OrderID: "llm-subconsumption", Type: resources.SubConsumption,
			Namespace: "ns-b", AppName: "llm-a", AppType: resources.AppType[resources.LLMToken],
			Amount: 20, Owner: workspaceConsumptionTestOwner, Status: resources.Settled,
		},
		resources.Billing{
			Time: endTime, OrderID: "app-store-direct", Type: resources.Consumption,
			Namespace: "ns-c", AppName: "store-a", AppType: resources.AppType[resources.AppStore],
			Amount: 40, Owner: workspaceConsumptionTestOwner, Status: resources.Settled,
		},
		resources.Billing{
			Time: endTime, OrderID: "unsettled", Type: resources.Consumption,
			Namespace: "ns-ignored", AppType: resources.AppType[resources.APP], Amount: 1000,
			Owner: workspaceConsumptionTestOwner, Status: resources.Unsettled,
		},
		resources.Billing{
			Time: endTime, OrderID: "other-owner", Type: resources.Consumption,
			Namespace: "ns-ignored", AppType: resources.AppType[resources.APP], Amount: 2000,
			Owner: "other-owner", Status: resources.Settled,
		},
		resources.Billing{
			Time: endTime.Add(time.Hour), OrderID: "outside-range", Type: resources.Consumption,
			Namespace: "ns-ignored", AppType: resources.AppType[resources.APP], Amount: 3000,
			Owner: workspaceConsumptionTestOwner, Status: resources.Settled,
		},
	}
	collection := mongoDB.getBillingCollection()
	if _, err := collection.InsertMany(ctx, documents); err != nil {
		t.Fatalf("insert billing fixtures: %v", err)
	}

	baseRequest := helper.ConsumptionRecordReq{
		TimeRange: helper.TimeRange{StartTime: startTime, EndTime: endTime},
		AuthBase:  helper.AuthBase{Auth: &helper.Auth{Owner: workspaceConsumptionTestOwner}},
	}
	tests := []struct {
		name string
		req  helper.ConsumptionRecordReq
		want map[string]int64
	}{
		{
			name: "all settled consumption by namespace",
			req:  baseRequest,
			want: map[string]int64{"ns-a": 150, "ns-b": 20, "ns-c": 40},
		},
		{
			name: "namespace filter",
			req: withWorkspaceConsumptionRequest(
				baseRequest,
				func(req *helper.ConsumptionRecordReq) {
					req.Namespace = "ns-a"
				},
			),
			want: map[string]int64{"ns-a": 150},
		},
		{
			name: "app type filter",
			req: withWorkspaceConsumptionRequest(
				baseRequest,
				func(req *helper.ConsumptionRecordReq) {
					req.AppType = " llm-token "
				},
			),
			want: map[string]int64{"ns-b": 20},
		},
		{
			name: "nested app name filter",
			req: withWorkspaceConsumptionRequest(
				baseRequest,
				func(req *helper.ConsumptionRecordReq) {
					req.AppName = "app-a"
				},
			),
			want: map[string]int64{"ns-a": 30},
		},
		{
			name: "direct app name filter",
			req: withWorkspaceConsumptionRequest(
				baseRequest,
				func(req *helper.ConsumptionRecordReq) {
					req.AppName = "store-a"
				},
			),
			want: map[string]int64{"ns-c": 40},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := mongoDB.GetWorkspaceConsumptionAmount(test.req)
			if err != nil {
				t.Fatalf("get workspace consumption amount: %v", err)
			}
			if !mapsEqual(got, test.want) {
				t.Fatalf("workspace consumption = %#v, want %#v", got, test.want)
			}
		})
	}
}

func TestGetConsumptionAmountWithMongoRuntime(t *testing.T) {
	mongoDB, ctx := newWorkspaceConsumptionMongo(t)
	startTime := time.Date(2026, time.January, 1, 0, 0, 0, 0, time.UTC)
	endTime := time.Date(2026, time.January, 2, 0, 0, 0, 0, time.UTC)
	documents := anonymizedConsumptionBillingFixtures(startTime, endTime)
	if _, err := mongoDB.getBillingCollection().InsertMany(ctx, documents); err != nil {
		t.Fatalf("insert billing fixtures: %v", err)
	}

	baseRequest := helper.ConsumptionRecordReq{
		TimeRange: helper.TimeRange{StartTime: startTime, EndTime: endTime},
		AuthBase:  helper.AuthBase{Auth: &helper.Auth{Owner: workspaceConsumptionTestOwner}},
	}
	tests := []struct {
		name string
		req  helper.ConsumptionRecordReq
		want int64
	}{
		{name: "all settled consumption", req: baseRequest, want: 804},
		{
			name: "namespace filter",
			req: withWorkspaceConsumptionRequest(
				baseRequest,
				func(req *helper.ConsumptionRecordReq) {
					req.Namespace = "workspace-consumption-test-namespace"
				},
			),
			want: 804,
		},
		{
			name: "nested app type filter",
			req: withWorkspaceConsumptionRequest(
				baseRequest,
				func(req *helper.ConsumptionRecordReq) {
					req.AppType = " app "
				},
			),
			want: 69,
		},
		{
			name: "nested resource name filter",
			req: withWorkspaceConsumptionRequest(
				baseRequest,
				func(req *helper.ConsumptionRecordReq) {
					req.AppType = resources.DB
					req.AppName = "resource-db-primary"
				},
			),
			want: 11,
		},
		{
			name: "direct app name filter",
			req: withWorkspaceConsumptionRequest(
				baseRequest,
				func(req *helper.ConsumptionRecordReq) {
					req.AppName = "app-store-a"
				},
			),
			want: 451,
		},
		{
			name: "direct app type and name filter",
			req: withWorkspaceConsumptionRequest(
				baseRequest,
				func(req *helper.ConsumptionRecordReq) {
					req.AppType = resources.AppStore
					req.AppName = "app-store-a"
				},
			),
			want: 451,
		},
		{
			name: "direct app name with one nested cost",
			req: withWorkspaceConsumptionRequest(
				baseRequest,
				func(req *helper.ConsumptionRecordReq) {
					req.AppName = "app-store-b"
				},
			),
			want: 17,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := mongoDB.GetConsumptionAmount(test.req)
			if err != nil {
				t.Fatalf("get consumption amount: %v", err)
			}
			if got != test.want {
				t.Fatalf("consumption amount = %d, want %d", got, test.want)
			}
		})
	}
}

func anonymizedConsumptionBillingFixtures(startTime, endTime time.Time) []any {
	// This reduced fixture keeps the shapes found in the exported records while
	// replacing all identifiers, timestamps, and amounts with synthetic values.
	// Ordinary resource records have no app_name and bill through app_costs;
	// APP-STORE records have a parent app_name and a component breakdown.
	return []any{
		resources.Billing{
			Time: startTime, OrderID: "billing-db", Type: resources.Consumption,
			Namespace: "workspace-consumption-test-namespace",
			AppType:   resources.AppType[resources.DB],
			AppCosts: []resources.AppCost{
				{Name: "resource-db-primary", Amount: 11},
				{Name: "resource-db-secondary", Amount: 2},
				{Name: "resource-db-cache", Amount: 2},
				{Name: "resource-db-data", Amount: 36},
				{Name: "resource-db-backup", Amount: 38},
			},
			Amount: 89, Owner: workspaceConsumptionTestOwner, Status: resources.Settled,
		},
		resources.Billing{
			Time: startTime, OrderID: "billing-app", Type: resources.Consumption,
			Namespace: "workspace-consumption-test-namespace",
			AppType:   resources.AppType[resources.APP],
			AppCosts: []resources.AppCost{
				{Name: "resource-app-dashboard", Amount: 9},
				{Name: "resource-app-runtime", Amount: 60},
			},
			Amount: 69, Owner: workspaceConsumptionTestOwner, Status: resources.Settled,
		},
		resources.Billing{
			Time: startTime, OrderID: "billing-job", Type: resources.Consumption,
			Namespace: "workspace-consumption-test-namespace",
			AppType:   resources.AppType[resources.JOB],
			AppCosts:  []resources.AppCost{{Name: "resource-job", Amount: 56}},
			Amount:    56, Owner: workspaceConsumptionTestOwner, Status: resources.Settled,
		},
		resources.Billing{
			Time: startTime, OrderID: "billing-object-storage", Type: resources.Consumption,
			Namespace: "workspace-consumption-test-namespace",
			AppType:   resources.AppType[resources.ObjectStorage],
			AppCosts: []resources.AppCost{
				{Name: "resource-object-a", Amount: 1},
				{Name: "resource-object-b", Amount: 3},
				{Name: "resource-object-c", Amount: 7},
				{Name: "resource-object-d", Amount: 46},
				{Name: "resource-object-e", Amount: 1},
			},
			Amount: 58, Owner: workspaceConsumptionTestOwner, Status: resources.Settled,
		},
		resources.Billing{
			Time: startTime, OrderID: "billing-backup", Type: resources.Consumption,
			Namespace: "workspace-consumption-test-namespace",
			AppType:   resources.AppType[resources.DBBackup],
			AppCosts: []resources.AppCost{
				{Name: "resource-backup-a", Amount: 7},
				{Name: "resource-backup-b", Amount: 57},
			},
			Amount: 64, Owner: workspaceConsumptionTestOwner, Status: resources.Settled,
		},
		resources.Billing{
			Time: startTime, OrderID: "billing-app-store-a", Type: resources.Consumption,
			Namespace: "workspace-consumption-test-namespace",
			AppName:   "app-store-a", AppType: resources.AppType[resources.AppStore],
			AppCosts: []resources.AppCost{
				{Name: "app-store-a-db", Amount: 56},
				{Name: "app-store-a-api", Amount: 9},
				{Name: "app-store-a-cache", Amount: 78},
				{Name: "app-store-a-proxy", Amount: 20},
				{Name: "app-store-a-worker", Amount: 87},
				{Name: "app-store-a-storage", Amount: 84},
				{Name: "app-store-a-sandbox", Amount: 41},
				{Name: "app-store-a", Amount: 56},
				{Name: "app-store-a-plugin", Amount: 20},
			},
			Amount: 451, Owner: workspaceConsumptionTestOwner, Status: resources.Settled,
		},
		resources.Billing{
			Time: startTime, OrderID: "billing-app-store-b", Type: resources.Consumption,
			Namespace: "workspace-consumption-test-namespace",
			AppName:   "app-store-b", AppType: resources.AppType[resources.AppStore],
			AppCosts: []resources.AppCost{{Name: "app-store-b", Amount: 17}},
			Amount:   17, Owner: workspaceConsumptionTestOwner, Status: resources.Settled,
		},
		resources.Billing{
			Time: endTime, OrderID: "billing-unsettled", Type: resources.Consumption,
			Namespace: "workspace-consumption-test-namespace",
			AppType:   resources.AppType[resources.APP],
			AppCosts:  []resources.AppCost{{Name: "ignored-unsettled", Amount: 9000}},
			Amount:    9000, Owner: workspaceConsumptionTestOwner, Status: resources.Unsettled,
		},
		resources.Billing{
			Time: startTime, OrderID: "billing-other-owner", Type: resources.Consumption,
			Namespace: "workspace-consumption-test-namespace",
			AppType:   resources.AppType[resources.APP],
			AppCosts:  []resources.AppCost{{Name: "ignored-other-owner", Amount: 10000}},
			Amount:    10000, Owner: "other-owner", Status: resources.Settled,
		},
		resources.Billing{
			Time: endTime.Add(
				time.Hour,
			),
			OrderID:   "billing-outside-range",
			Type:      resources.Consumption,
			Namespace: "workspace-consumption-test-namespace",
			AppType:   resources.AppType[resources.APP],
			AppCosts:  []resources.AppCost{{Name: "ignored-outside-range", Amount: 11000}},
			Amount:    11000,
			Owner:     workspaceConsumptionTestOwner,
			Status:    resources.Settled,
		},
	}
}

func BenchmarkGetWorkspaceConsumptionAmountWithMongoRuntime(b *testing.B) {
	mongoDB, ctx := newWorkspaceConsumptionMongo(b)
	startTime := time.Date(2026, time.January, 1, 0, 0, 0, 0, time.UTC)
	endTime := startTime.Add(24 * time.Hour)
	documents := make([]any, 0, workspaceConsumptionBenchmarkRecords)
	for i := range workspaceConsumptionBenchmarkRecords {
		documents = append(documents, resources.Billing{
			Time:      startTime.Add(time.Duration(i%24) * time.Hour),
			OrderID:   fmt.Sprintf("benchmark-%d", i),
			Type:      resources.Consumption,
			Namespace: fmt.Sprintf("ns-%02d", i%32),
			AppCosts: []resources.AppCost{{
				Name:   "app-a",
				Amount: int64(i%100 + 1),
			}},
			AppType: resources.AppType[resources.APP],
			Amount:  int64(i%100 + 1),
			Owner:   workspaceConsumptionTestOwner,
			Status:  resources.Settled,
		})
	}
	if _, err := mongoDB.getBillingCollection().InsertMany(ctx, documents); err != nil {
		b.Fatalf("insert billing benchmark fixtures: %v", err)
	}

	baseRequest := helper.ConsumptionRecordReq{
		TimeRange: helper.TimeRange{StartTime: startTime, EndTime: endTime},
		AuthBase:  helper.AuthBase{Auth: &helper.Auth{Owner: workspaceConsumptionTestOwner}},
	}
	benchmarks := []struct {
		name string
		req  helper.ConsumptionRecordReq
	}{
		{name: "all", req: baseRequest},
		{
			name: "namespace",
			req: withWorkspaceConsumptionRequest(
				baseRequest,
				func(req *helper.ConsumptionRecordReq) {
					req.Namespace = "ns-07"
				},
			),
		},
		{
			name: "app_type",
			req: withWorkspaceConsumptionRequest(
				baseRequest,
				func(req *helper.ConsumptionRecordReq) {
					req.AppType = "app"
				},
			),
		},
		{
			name: "app_name",
			req: withWorkspaceConsumptionRequest(
				baseRequest,
				func(req *helper.ConsumptionRecordReq) {
					req.AppName = "app-a"
				},
			),
		},
	}

	for _, benchmark := range benchmarks {
		b.Run(benchmark.name, func(b *testing.B) {
			b.ReportAllocs()
			b.ResetTimer()
			for range b.N {
				if _, err := mongoDB.GetWorkspaceConsumptionAmount(benchmark.req); err != nil {
					b.Fatalf("get workspace consumption amount: %v", err)
				}
			}
		})
	}
}

func BenchmarkGetConsumptionAmountWithMongoRuntime(b *testing.B) {
	mongoDB, ctx := newWorkspaceConsumptionMongo(b)
	startTime := time.Date(2026, time.January, 1, 0, 0, 0, 0, time.UTC)
	endTime := startTime.Add(24 * time.Hour)
	documents := make([]any, 0, workspaceConsumptionBenchmarkRecords)
	for i := range workspaceConsumptionBenchmarkRecords {
		document := resources.Billing{
			Time:      startTime.Add(time.Duration(i%24) * time.Hour),
			OrderID:   fmt.Sprintf("consumption-benchmark-%d", i),
			Namespace: fmt.Sprintf("ns-%02d", i%32),
			Owner:     workspaceConsumptionTestOwner,
			Status:    resources.Settled,
		}
		switch i % 4 {
		case 0:
			document.Type = resources.Consumption
			document.AppType = resources.AppType[resources.AppStore]
			document.AppName = "store-a"
			document.Amount = int64(i%100 + 1)
		case 1:
			document.Type = resources.SubConsumption
			document.AppType = resources.AppType[resources.LLMToken]
			document.AppName = "llm-a"
			document.Amount = int64(i%100 + 1)
		default:
			document.Type = resources.Consumption
			document.AppType = resources.AppType[resources.APP]
			document.AppCosts = []resources.AppCost{
				{Name: "app-a", Amount: int64(i%100 + 1)},
				{Name: "app-b", Amount: 5},
			}
		}
		documents = append(documents, document)
	}
	if _, err := mongoDB.getBillingCollection().InsertMany(ctx, documents); err != nil {
		b.Fatalf("insert billing benchmark fixtures: %v", err)
	}

	baseRequest := helper.ConsumptionRecordReq{
		TimeRange: helper.TimeRange{StartTime: startTime, EndTime: endTime},
		AuthBase:  helper.AuthBase{Auth: &helper.Auth{Owner: workspaceConsumptionTestOwner}},
	}
	benchmarks := []struct {
		name string
		req  helper.ConsumptionRecordReq
	}{
		{name: "all", req: baseRequest},
		{
			name: "namespace",
			req: withWorkspaceConsumptionRequest(
				baseRequest,
				func(req *helper.ConsumptionRecordReq) {
					req.Namespace = "ns-07"
				},
			),
		},
		{
			name: "app_type",
			req: withWorkspaceConsumptionRequest(
				baseRequest,
				func(req *helper.ConsumptionRecordReq) {
					req.AppType = resources.APP
				},
			),
		},
		{
			name: "app_name",
			req: withWorkspaceConsumptionRequest(
				baseRequest,
				func(req *helper.ConsumptionRecordReq) {
					req.AppType = resources.APP
					req.AppName = "app-a"
				},
			),
		},
	}

	for _, benchmark := range benchmarks {
		b.Run(benchmark.name, func(b *testing.B) {
			b.ReportAllocs()
			b.ResetTimer()
			for range b.N {
				if _, err := mongoDB.GetConsumptionAmount(benchmark.req); err != nil {
					b.Fatalf("get consumption amount: %v", err)
				}
			}
		})
	}
}

func withWorkspaceConsumptionRequest(
	base helper.ConsumptionRecordReq,
	update func(*helper.ConsumptionRecordReq),
) helper.ConsumptionRecordReq {
	request := base
	update(&request)
	return request
}

func mapsEqual(got, want map[string]int64) bool {
	if len(got) != len(want) {
		return false
	}
	for key, wantValue := range want {
		if got[key] != wantValue {
			return false
		}
	}
	return true
}
