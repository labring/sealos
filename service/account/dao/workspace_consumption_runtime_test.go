package dao

import (
	"context"
	"net"
	"testing"
	"time"

	"github.com/labring/sealos/controllers/pkg/resources"
	"github.com/labring/sealos/service/account/helper"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	workspaceConsumptionTestOwner = "workspace-consumption-test-owner"
	workspaceConsumptionTestDB    = "workspace-consumption-test"
	workspaceConsumptionTestColl  = "billing"
)

func newWorkspaceConsumptionMongo(t *testing.T) (*MongoDB, context.Context) {
	t.Helper()
	testcontainers.SkipIfProviderIsNotHealthy(t)

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
		t.Fatalf("start MongoDB container: %v", err)
	}
	t.Cleanup(func() {
		if err := container.Terminate(ctx); err != nil {
			t.Errorf("terminate MongoDB container: %v", err)
		}
	})

	host, err := container.Host(ctx)
	if err != nil {
		t.Fatalf("get MongoDB container host: %v", err)
	}
	port, err := container.MappedPort(ctx, "27017/tcp")
	if err != nil {
		t.Fatalf("get MongoDB container port: %v", err)
	}
	client, err := mongo.Connect(ctx, options.Client().ApplyURI("mongodb://"+net.JoinHostPort(host, port.Port())))
	if err != nil {
		t.Fatalf("connect MongoDB client: %v", err)
	}
	if err := client.Ping(ctx, nil); err != nil {
		_ = client.Disconnect(ctx)
		t.Fatalf("ping MongoDB: %v", err)
	}
	t.Cleanup(func() {
		if err := client.Disconnect(ctx); err != nil {
			t.Errorf("disconnect MongoDB client: %v", err)
		}
	})

	return &MongoDB{
		Client:        client,
		AccountDBName: workspaceConsumptionTestDB,
		BillingConn:   workspaceConsumptionTestColl,
	}, ctx
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
			req:  withWorkspaceConsumptionRequest(baseRequest, func(req *helper.ConsumptionRecordReq) { req.Namespace = "ns-a" }),
			want: map[string]int64{"ns-a": 150},
		},
		{
			name: "app type filter",
			req:  withWorkspaceConsumptionRequest(baseRequest, func(req *helper.ConsumptionRecordReq) { req.AppType = " llm-token " }),
			want: map[string]int64{"ns-b": 20},
		},
		{
			name: "nested app name filter",
			req:  withWorkspaceConsumptionRequest(baseRequest, func(req *helper.ConsumptionRecordReq) { req.AppName = "app-a" }),
			want: map[string]int64{"ns-a": 30},
		},
		{
			name: "direct app name filter",
			req:  withWorkspaceConsumptionRequest(baseRequest, func(req *helper.ConsumptionRecordReq) { req.AppName = "store-a" }),
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
