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
	"testing"
	"time"

	"github.com/labring/sealos/controllers/pkg/types"

	"github.com/labring/sealos/controllers/pkg/resources"

	"go.mongodb.org/mongo-driver/mongo"
)

var testTime = time.Date(2023, 5, 9, 5, 0, 0, 0, time.UTC)

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

	for i := 0; i < numRecords; i++ {
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
			name:    fmt.Sprintf("Test case %d: Save deduction record with owner 'ns-vd1k1dk3'", i+1),
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
	//err = m.SavePropertyTypes(resources.DefaultPropertyTypeLS.Types)
	//if err != nil {
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
	monitorCombinations, err := m.GetDistinctMonitorCombinations(queryTime.Add(-time.Hour), queryTime)
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
	var traffic []*types.ObjectStorageTraffic
	for i := 0; i < 10; i++ {
		traffic = append(traffic, &types.ObjectStorageTraffic{
			Time:      time.Now().UTC(),
			User:      "user-" + fmt.Sprint(i),
			Bucket:    "bucket-" + fmt.Sprint(i),
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

	bytes, err := m.HandlerTimeObjBucketSentTraffic(time.Now().UTC().Add(-time.Hour), time.Now().UTC(), "bucket-6")
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
	billings, err := m.GenerateBillingData(time.Now().UTC().Add(-time.Hour), time.Now().UTC(), prols, ownerToNS)
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
	endHourTime := time.Date(now.Year(), now.Month(), now.Day(), now.Hour(), 0, 0, 0, time.Local).UTC()
	owners, err := m.GetOwnersRecentUpdates([]string{"nfhmc74p"}, endHourTime)
	if err != nil {
		t.Fatalf("failed to get owners without recent updates: %v", err)
	}
	t.Logf("get owners without recent updates success: %v", owners)
}
