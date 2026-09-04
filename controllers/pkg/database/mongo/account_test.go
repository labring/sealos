// Copyright © 2023 sealos.
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

package mongo

import (
	"context"
	"fmt"
	"os"
	"reflect"
	"strconv"
	"testing"
	"time"

	"github.com/labring/sealos/controllers/pkg/resources"
	"github.com/labring/sealos/controllers/pkg/types"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var testTime = time.Date(2023, time.May, 9, 5, 0, 0, 0, time.UTC)

func TestGenerateBillingDataPreservesTypedGroupKey(t *testing.T) {
	start := time.Date(2026, time.July, 29, 1, 0, 0, 0, time.UTC)
	end := start.Add(time.Hour)
	properties := resources.NewPropertyTypeLS([]resources.PropertyType{
		{
			Name: "cpu", Enum: 0, PriceType: resources.AVG, UnitPrice: 1,
		},
	})
	records := []resources.Monitor{
		{
			Time: start, Category: "ns-owner", Type: 1,
			ParentType: 255, ParentName: "parent/name", Name: "child",
			Used: resources.EnumUsedMap{0: 60},
		},
	}

	billings, err := GenerateBillingDataFromRecords(
		records, properties, start, end, "owner",
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(billings) != 1 {
		t.Fatalf("billing count = %d, want 1", len(billings))
	}
	if billings[0].AppType != 255 || billings[0].AppName != "parent/name" {
		t.Fatalf(
			"billing group = (%d, %q), want (255, %q)",
			billings[0].AppType,
			billings[0].AppName,
			"parent/name",
		)
	}
}

func TestMongoDB_SaveBillingsWithAccountBalance(t *testing.T) {
	type fields struct {
		URL          string
		Client       *mongo.Client
		DBName       string
		MonitorConn  string
		MeteringConn string
		BillingConn  string
	}
	type args struct {
		accountBalanceSpec *resources.Billing
	}

	// Generate a large number of AccountBalanceSpec data
	numRecords := 10
	accountBalanceSpecs := make([]*resources.Billing, numRecords+10)

	for i := range numRecords {
		accountBalanceSpecs[i] = &resources.Billing{
			Time:      testTime,
			OrderID:   fmt.Sprintf("random_order_id_%d", i+1),
			Namespace: "ns-vd1k1dk3",
			Owner:     "vd1k1dk3",
			Type:      0,
			AppType:   resources.AppType[resources.DB],
			AppCosts: []resources.AppCost{
				{
					UsedAmount: map[uint8]int64{
						resources.DefaultPropertyTypeLS.StringMap["cpu"].Enum:     int64(1000 + i),
						resources.DefaultPropertyTypeLS.StringMap["memory"].Enum:  int64(2000 + i),
						resources.DefaultPropertyTypeLS.StringMap["storage"].Enum: int64(3000 + i),
						resources.DefaultPropertyTypeLS.StringMap["network"].Enum: int64(4000 + i),
					},
				},
			},
			Amount: int64(6000 + 3*i),
		}
	}
	for i := 10; i < numRecords+10; i++ {
		accountBalanceSpecs[i] = &resources.Billing{
			Time:    testTime,
			OrderID: fmt.Sprintf("random_order_id_recharge%d", i+1),
			Owner:   "vd1k1dk3",
			Type:    1,
			Amount:  int64(1000 + i),
		}
	}

	tests := []struct {
		name    string
		fields  fields
		args    args
		wantErr bool
	}{}

	for i, spec := range accountBalanceSpecs {
		tests = append(tests, struct {
			name    string
			fields  fields
			args    args
			wantErr bool
		}{
			name: fmt.Sprintf(
				"Test case %d: Save deduction record with owner 'ns-vd1k1dk3'",
				i+1,
			),
			args:    args{accountBalanceSpec: spec},
			wantErr: false,
		})
	}

	dbCTX := context.Background()

	m, err := NewMongoInterface(dbCTX, os.Getenv("MONGODB_URI"))
	if err != nil {
		t.Errorf("failed to connect mongo: error = %v", err)
	}
	defer func() {
		if err = m.Disconnect(dbCTX); err != nil {
			t.Errorf("failed to disconnect mongo: error = %v", err)
		}
	}()

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := m.CreateBillingIfNotExist(); err != nil {
				t.Fatalf("failed to create billing time series: error = %v", err)
			}
			if err := m.SaveBillings(tt.args.accountBalanceSpec); (err != nil) != tt.wantErr {
				t.Fatalf("SaveBillingsWithAccountBalance() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestMongoDB_getBillingCollection(t *testing.T) {
	type fields struct {
		URL          string
		Client       *mongo.Client
		DBName       string
		MonitorConn  string
		MeteringConn string
		BillingConn  string
	}
	tests := []struct {
		name   string
		fields fields
		want   *mongo.Collection
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := &mongoDB{
				Client:            tt.fields.Client,
				AccountDB:         tt.fields.DBName,
				MonitorConnPrefix: tt.fields.MonitorConn,
				MeteringConn:      tt.fields.MeteringConn,
				BillingConn:       tt.fields.BillingConn,
			}
			if got := m.getBillingCollection(); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("getBillingCollection() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestMongoDB_getMeteringCollection(t *testing.T) {
	type fields struct {
		URL          string
		Client       *mongo.Client
		DBName       string
		MonitorConn  string
		MeteringConn string
		BillingConn  string
	}
	tests := []struct {
		name   string
		fields fields
		want   *mongo.Collection
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := &mongoDB{
				Client:            tt.fields.Client,
				AccountDB:         tt.fields.DBName,
				MonitorConnPrefix: tt.fields.MonitorConn,
				MeteringConn:      tt.fields.MeteringConn,
				BillingConn:       tt.fields.BillingConn,
			}
			if got := m.getMeteringCollection(); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("getMeteringCollection() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestMongoDB_getMonitorCollection(t *testing.T) {
	type fields struct {
		URL          string
		Client       *mongo.Client
		DBName       string
		MonitorConn  string
		MeteringConn string
		BillingConn  string
	}
	tests := []struct {
		name     string
		fields   fields
		collTime time.Time
		want     *mongo.Collection
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := &mongoDB{
				Client:            tt.fields.Client,
				AccountDB:         tt.fields.DBName,
				MonitorConnPrefix: tt.fields.MonitorConn,
				MeteringConn:      tt.fields.MeteringConn,
				BillingConn:       tt.fields.BillingConn,
			}
			if got := m.getMonitorCollection(tt.collTime); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("getMonitorCollection() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestNewMongoInterface(t *testing.T) {
	type args struct {
		ctx context.Context
		URL string
	}
	tests := []struct {
		name    string
		args    args
		want    *mongoDB
		wantErr bool
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := NewMongoInterface(tt.args.ctx, tt.args.URL)
			if (err != nil) != tt.wantErr {
				t.Errorf("NewMongoInterface() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("NewMongoInterface() got = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestMongoDB_GetBillingLastUpdateTime(t *testing.T) {
	dbCTX := context.Background()

	m, err := NewMongoInterface(dbCTX, os.Getenv("MONGODB_URI"))
	if err != nil {
		t.Errorf("failed to connect mongo: error = %v", err)
	}
	defer func() {
		if err = m.Disconnect(dbCTX); err != nil {
			t.Errorf("failed to disconnect mongo: error = %v", err)
		}
	}()

	exist, lastUpdateTime, err := m.GetBillingLastUpdateTime("vlemql0v", 0)
	if err != nil {
		t.Fatalf("failed to get billing last update time: error = %v", err)
	}
	if !exist {
		t.Fatalf(" billing last update time not exist")
	}
	t.Logf("lastUpdateTime: %v", lastUpdateTime)
}

func TestMongoDB_DropMonitorCollectionsOlderThan(t *testing.T) {
	dbCTX := context.Background()
	m, err := NewMongoInterface(dbCTX, os.Getenv("MONGODB_URI"))
	if err != nil {
		t.Errorf("failed to connect mongo: error = %v", err)
	}
	defer func() {
		if err = m.Disconnect(dbCTX); err != nil {
			t.Errorf("failed to disconnect mongo: error = %v", err)
		}
	}()
	// 0711
	if err = m.DropMonitorCollectionsOlderThan(30); err != nil {
		t.Fatalf("failed to drop monitor collections older than 30 days: %v", err)
	}
}

/*
info generate billing data used {2 ns-7uyfrr47 pay-xy map[0:325 1:166 2:0]}

	limits: * 3
	   cpu: 500m
	   memory: 256Mi
*/

func TestMongoDB_SetPropertyTypeLS(t *testing.T) {
	dbCTX := context.Background()

	m, err := NewMongoInterface(dbCTX, os.Getenv("MONGODB_URI"))
	if err != nil {
		t.Errorf("failed to connect mongo: error = %v", err)
	}
	defer func() {
		if err = m.Disconnect(dbCTX); err != nil {
			t.Errorf("failed to disconnect mongo: error = %v", err)
		}
	}()
	err = m.InitDefaultPropertyTypeLS()
	if err != nil {
		t.Fatalf("failed to get property type ls: %v", err)
	}
	t.Logf("propertyTypeLS: %+v", resources.DefaultPropertyTypeLS)

	for _, tp := range resources.DefaultPropertyTypeLS.Types {
		t.Logf("propertyTypeLS type: %v", tp)
	}
	// err = m.SavePropertyTypes(resources.DefaultPropertyTypeLS.Types)
	// if err != nil {
	//	t.Fatalf("failed to save property types: %v", err)
	//}
}

func Test_mongoDB_GetDistinctMonitorCombinations(t *testing.T) {
	dbCTX := context.Background()

	m, err := NewMongoInterface(dbCTX, os.Getenv("MONGODB_URI"))
	if err != nil {
		t.Errorf("failed to connect mongo: error = %v", err)
	}
	defer func() {
		if err = m.Disconnect(dbCTX); err != nil {
			t.Errorf("failed to disconnect mongo: error = %v", err)
		}
	}()
	queryTime := time.Now().UTC()
	monitorCombinations, err := m.GetDistinctMonitorCombinations(
		queryTime.Add(-time.Hour),
		queryTime,
	)
	if err != nil {
		t.Fatalf("failed to get distinct monitor combinations: %v", err)
	}
	t.Logf("monitorCombinations: %v", monitorCombinations)
}

func Test_mongoDB_CreateTTLTrafficTimeSeries(t *testing.T) {
	dbCTX := context.Background()

	m, err := NewMongoInterface(dbCTX, os.Getenv("MONGODB_URI"))
	if err != nil {
		t.Errorf("failed to connect mongo: error = %v", err)
	}
	defer func() {
		if err = m.Disconnect(dbCTX); err != nil {
			t.Errorf("failed to disconnect mongo: error = %v", err)
		}
	}()

	if err = m.CreateTTLTrafficTimeSeries(); err != nil {
		t.Fatalf("failed to create TTL traffic time series: %v", err)
	}
	t.Logf("create TTL traffic time series success")
}

func Test_mongoDB_SaveObjTraffic(t *testing.T) {
	dbCTX := context.Background()

	m, err := NewMongoInterface(dbCTX, os.Getenv("MONGODB_URI"))
	if err != nil {
		t.Errorf("failed to connect mongo: error = %v", err)
	}
	defer func() {
		if err = m.Disconnect(dbCTX); err != nil {
			t.Errorf("failed to disconnect mongo: error = %v", err)
		}
	}()
	traffic := make([]*types.ObjectStorageTraffic, 0, 10)
	for i := range 10 {
		traffic = append(traffic, &types.ObjectStorageTraffic{
			Time:      time.Now().UTC(),
			User:      "user-" + strconv.Itoa(i),
			Bucket:    "bucket-" + strconv.Itoa(i),
			TotalSent: int64(1000 + i),
			Sent:      int64(100 + i),
		})
	}
	if err = m.SaveObjTraffic(traffic...); err != nil {
		t.Fatalf("failed to save object storage traffic: %v", err)
	}
	t.Logf("save object storage traffic success")
}

func Test_mongoDB_GetAllLatestObjTraffic(t *testing.T) {
	dbCTX := context.Background()

	m, err := NewMongoInterface(dbCTX, os.Getenv("MONGODB_URI"))
	if err != nil {
		t.Errorf("failed to connect mongo: error = %v", err)
	}
	defer func() {
		if err = m.Disconnect(dbCTX); err != nil {
			t.Errorf("failed to disconnect mongo: error = %v", err)
		}
	}()

	traffic, err := m.GetAllLatestObjTraffic(time.Now().Add(-time.Hour), time.Now())
	if err != nil {
		t.Fatalf("failed to save object storage traffic: %v", err)
	}
	t.Logf("save object storage traffic success")
	for _, tf := range traffic {
		t.Logf("traffic: %#+v", tf)
	}
}

func Test_mongoDB_HandlerTimeObjBucketSentTraffic(t *testing.T) {
	dbCTX := context.Background()

	m, err := NewMongoInterface(dbCTX, os.Getenv("MONGODB_URI"))
	if err != nil {
		t.Errorf("failed to connect mongo: error = %v", err)
	}
	defer func() {
		if err = m.Disconnect(dbCTX); err != nil {
			t.Errorf("failed to disconnect mongo: error = %v", err)
		}
	}()

	bytes, err := m.HandlerTimeObjBucketSentTraffic(
		time.Now().UTC().Add(-time.Hour),
		time.Now().UTC(),
		"bucket-6",
	)
	if err != nil {
		t.Fatalf("failed to handle time object bucket usage: %v", err)
	}
	t.Logf("handle time object bucket usage success: %v", bytes)
}

func init() {
	os.Setenv("MONGODB_URI", "")
}

func Test_mongoDB_GetTimeObjBucketBucket(t *testing.T) {
	dbCTX := context.Background()

	m, err := NewMongoInterface(dbCTX, os.Getenv("MONGODB_URI"))
	if err != nil {
		t.Errorf("failed to connect mongo: error = %v", err)
	}
	defer func() {
		if err = m.Disconnect(dbCTX); err != nil {
			t.Errorf("failed to disconnect mongo: error = %v", err)
		}
	}()

	buckets, err := m.GetTimeObjBucketBucket(time.Now().UTC().Add(-10*time.Hour), time.Now().UTC())
	if err != nil {
		t.Fatalf("failed to get time object bucket bucket: %v", err)
	}
	t.Logf("get time object bucket bucket success： len: %v", len(buckets))
	for _, bucket := range buckets {
		t.Logf("bucket: %#+v", bucket)
	}
}

func Test_mongoDB_GetTimeUsedOwnerList(t *testing.T) {
	dbCTX := context.Background()

	m, err := NewMongoInterface(dbCTX, "")
	if err != nil {
		t.Errorf("failed to connect mongo: error = %v", err)
	}
	defer func() {
		if err = m.Disconnect(dbCTX); err != nil {
			t.Errorf("failed to disconnect mongo: error = %v", err)
		}
	}()

	owners, err := m.GetTimeUsedNamespaceList(time.Now().UTC().Add(-time.Hour), time.Now().UTC())
	if err != nil {
		t.Fatalf("failed to get time used owner list: %v", err)
	}
	t.Logf("get time used owner list success: %v", owners)
}

func Test_mongoDB_GenerateBillingData(t *testing.T) {
	dbCTX := context.Background()

	m, err := NewMongoInterface(dbCTX, os.Getenv("MONGO_URI"))
	if err != nil {
		t.Errorf("failed to connect mongo: error = %v", err)
	}
	defer func() {
		if err = m.Disconnect(dbCTX); err != nil {
			t.Errorf("failed to disconnect mongo: error = %v", err)
		}
	}()

	prols := resources.DefaultPropertyTypeLS
	ownerToNS := map[string][]string{
		"ax1uut8w": {"ns-tnw80mhk", "ns-ax1uut8w"},
	}
	billings, err := m.GenerateBillingData(
		time.Now().UTC().Add(-time.Hour),
		time.Now().UTC(),
		prols,
		ownerToNS,
	)
	if err != nil {
		t.Fatalf("failed to generate billing data: %v", err)
	}
	for _, billing := range billings {
		for _, bill := range billing {
			t.Logf("%+v\n", bill)
		}
	}
}

func Test_mongoDB_GetOwnersWithoutRecentUpdates(t *testing.T) {
	dbCTX := context.Background()

	m, err := NewMongoInterface(dbCTX, "")
	if err != nil {
		t.Errorf("failed to connect mongo: error = %v", err)
	}
	defer func() {
		if err = m.Disconnect(dbCTX); err != nil {
			t.Errorf("failed to disconnect mongo: error = %v", err)
		}
	}()
	now := time.Now().UTC()
	endHourTime := time.Date(now.Year(), now.Month(), now.Day(), now.Hour(), 0, 0, 0, time.Local).
		UTC()
	owners, err := m.GetOwnersRecentUpdates([]string{"nfhmc74p"}, endHourTime)
	if err != nil {
		t.Fatalf("failed to get owners without recent updates: %v", err)
	}
	t.Logf("get owners without recent updates success: %v", owners)
}

func TestGetTimeObjBucketExternalTraffic(t *testing.T) {
	// An init() in this file unconditionally clears MONGODB_URI, so this test
	// uses its own variable to receive the connection string.
	uri := os.Getenv("TEST_MONGODB_URI")
	if uri == "" {
		t.Skip("TEST_MONGODB_URI not set, skip mongo integration test")
	}
	// The test seeds and deletes rows in the shared cluster's audit database;
	// require an explicit second opt-in before writing anything.
	if os.Getenv("TEST_MONGODB_ALLOW_WRITE") != "true" {
		t.Skip("TEST_MONGODB_ALLOW_WRITE not set, refusing to write to a shared cluster")
	}
	ctx := context.Background()
	m, err := NewMongoInterface(ctx, uri)
	if err != nil {
		t.Fatal(err)
	}
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		t.Fatal(err)
	}
	defer client.Disconnect(ctx)
	start := time.Date(2026, time.August, 29, 10, 0, 0, 0, time.UTC)
	end := start.Add(2 * time.Hour)
	coll := client.Database("objectstorage-audit").Collection("usage_minutes")
	minuteDoc := func(minute time.Time, bucket, user, direction string, tx int64) interface{} {
		return bson.M{"bucket": bucket, "direction": direction, "minute": minute,
			"tx": tx, "rx": int64(0), "requests": 1, "user": user}
	}
	docs := []interface{}{
		minuteDoc(start, "abc12345-app", "abc12345", "external", 3<<20),
		minuteDoc(start.Add(30*time.Minute), "abc12345-app", "abc12345", "external", 1<<20),
		minuteDoc(start.Add(time.Hour), "abc12345-app", "abc12345", "external", 1<<20),
		minuteDoc(end, "abc12345-app", "abc12345", "external", 7<<20),
		minuteDoc(start, "abc12345-app", "abc12345", "internal", 9<<20),
		minuteDoc(start.Add(15*time.Minute), "zz999999-app", "zz999999", "external", 2<<20),
	}
	_, err = coll.InsertMany(ctx, docs)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		// Scope the cleanup to the seeded minutes (not bare bucket names) so a
		// concurrent test run using the same buckets never loses its own rows.
		_, _ = coll.DeleteMany(ctx, bson.M{
			"bucket": bson.M{"$in": bson.A{"abc12345-app", "zz999999-app"}},
			"minute": bson.M{"$gte": start, "$lte": end},
		})
	}()

	got, err := m.GetTimeObjBucketExternalTraffic(start, end)
	if err != nil {
		t.Fatal(err)
	}
	// usage_minutes buckets are [minute, minute+1); the query window maps to
	// [start, end) = [10:00, 12:00): the 10:00 and 10:30 external rows
	// (3Mi + 1Mi) and the 11:00 external row (1Mi) are included; the 12:00
	// row is excluded (end-exclusive); the 10:00 internal row is excluded by
	// direction. Totals: abc=5Mi, zz=2Mi.
	want := map[string]int64{"abc12345-app": 5 << 20, "zz999999-app": 2 << 20}
	sum := map[string]int64{}
	for _, r := range got {
		sum[r.Bucket] += r.Tx
	}
	for b, w := range want {
		if sum[b] != w {
			t.Errorf("bucket %q tx = %d, want %d", b, sum[b], w)
		}
	}

	// A mid-hour window start (restart scenario) is clamped down to the hour,
	// so it must yield the same totals as the hour-aligned window.
	got2, err := m.GetTimeObjBucketExternalTraffic(start.Add(30*time.Minute), end)
	if err != nil {
		t.Fatal(err)
	}
	sum2 := map[string]int64{}
	for _, r := range got2 {
		sum2[r.Bucket] += r.Tx
	}
	for b, w := range want {
		if sum2[b] != w {
			t.Errorf("clamped bucket %q tx = %d, want %d", b, sum2[b], w)
		}
	}
}
