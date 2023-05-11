package database

import (
	"context"
	"fmt"
	"github.com/dustin/go-humanize"
	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	"go.mongodb.org/mongo-driver/mongo"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"reflect"
	"sigs.k8s.io/yaml"
	"testing"
	"time"
)

func TestMongoDB_GetMeteringOwnerTimeResult(t *testing.T) {
	dbCTX := context.Background()

	m, err := NewMongoDB(dbCTX, "mongodb://192.168.64.21:27017/")
	if err != nil {
		t.Errorf("failed to connect mongo: error = %v", err)
	}
	defer func() {
		if err = m.Disconnect(dbCTX); err != nil {
			t.Errorf("failed to disconnect mongo: error = %v", err)
		}
	}()

	// 2023-04-30T17:00:00.000+00:00
	queryTime := time.Date(2023, 4, 30, 17, 0, 0, 0, time.UTC)

	//[]string{"ns-vd1k1dk3", "ns-cv46sqlr", "ns-wu8nptea", "ns-a2sh413v", "ns-l8ad16ee"}
	got, err := m.GetMeteringOwnerTimeResult(queryTime, []string{"ns-vd1k1dk3"}, []string{"cpu", "memory", "storage"}, "ns-vd1k1dk3")
	if err != nil {
		t.Errorf("failed to get metering owner time result: error = %v", err)
	}
	t.Logf("got: %v", got)
}

func TestMongoDB_QueryBillingRecords(t *testing.T) {
	dbCTX := context.Background()

	m, err := NewMongoDB(dbCTX, "mongodb://192.168.64.21:27017/")
	if err != nil {
		t.Errorf("failed to connect mongo: error = %v", err)
	}
	defer func() {
		if err = m.Disconnect(dbCTX); err != nil {
			t.Errorf("failed to disconnect mongo: error = %v", err)
		}
	}()

	// 2023-05-09T05:00:00.000+00:00
	queryTime := time.Date(2023, 5, 9, 5, 0, 0, 0, time.UTC)

	// page 1 pageSize 1 type -1
	query1 := &accountv1.BillingRecordQuery{
		Spec: accountv1.BillingRecordQuerySpec{
			StartTime: metav1.Time{Time: queryTime},
			EndTime:   metav1.Time{Time: queryTime.Add(3 * humanize.Day)},
			Page:      1,
			PageSize:  1,
			//OrderID:   "random_order_id_1",
			OrderID: "",
			Type:    -1,
		},
	}
	// page 1 pageSize 5 type 1
	query2 := &accountv1.BillingRecordQuery{
		Spec: accountv1.BillingRecordQuerySpec{
			StartTime: metav1.Time{Time: queryTime},
			EndTime:   metav1.Time{Time: queryTime.Add(3 * humanize.Day)},
			Page:      1,
			PageSize:  5,
			//OrderID:   "random_order_id_1",
			OrderID: "",
			Type:    1,
		},
	}
	// page 1 pageSize 5 type 0
	query3 := &accountv1.BillingRecordQuery{
		Spec: accountv1.BillingRecordQuerySpec{
			StartTime: metav1.Time{Time: queryTime},
			EndTime:   metav1.Time{Time: queryTime.Add(3 * humanize.Day)},
			Page:      1,
			PageSize:  5,
			//OrderID:   "random_order_id_1",
			OrderID: "",
			Type:    0,
		},
	}
	// only orderID

	query4 := &accountv1.BillingRecordQuery{
		Spec: accountv1.BillingRecordQuerySpec{
			OrderID: "random_order_id_recharge19",
		},
	}

	billingRecordQueryList := []*accountv1.BillingRecordQuery{
		query1, query2, query3, query4,
	}

	for _, billingRecordQuery := range billingRecordQueryList {
		err = m.QueryBillingRecords(billingRecordQuery, "ns-vd1k1dk3")
		if err != nil {
			t.Errorf("failed to query billing records: error = %v", err)
		}
		data, err := yaml.Marshal(billingRecordQuery)
		if err != nil {
			t.Errorf("failed to marshal billingRecordQuery: error = %v", err)
		}
		t.Logf("billingRecordQuery: %s", string(data))
	}
}

func TestMongoDB_SaveBillingsWithAccountBalance(t *testing.T) {
	type fields struct {
		Url          string
		Client       *mongo.Client
		DBName       string
		MonitorConn  string
		MeteringConn string
		BillingConn  string
	}
	type args struct {
		accountBalanceSpec *accountv1.AccountBalanceSpec
	}

	// Generate a large number of AccountBalanceSpec data
	numRecords := 10
	accountBalanceSpecs := make([]*accountv1.AccountBalanceSpec, numRecords+10)
	for i := 0; i < numRecords; i++ {
		accountBalanceSpecs[i] = &accountv1.AccountBalanceSpec{
			OrderID: fmt.Sprintf("random_order_id_%d", i+1),
			Owner:   "ns-vd1k1dk3",
			Time:    metav1.Time{time.Date(2023, 5, 9, 5, 0, 0, 0, time.UTC)},
			Type:    0,
			Costs: map[string]int64{
				"cpu":     int64(1000 + i),
				"memory":  int64(2000 + i),
				"storage": int64(3000 + i),
			},
			Amount: int64(6000 + 3*i),
		}
	}
	for i := 10; i < numRecords+10; i++ {
		accountBalanceSpecs[i] = &accountv1.AccountBalanceSpec{
			OrderID: fmt.Sprintf("random_order_id_recharge%d", i+1),
			Owner:   "ns-vd1k1dk3",
			Time:    metav1.Time{time.Date(2023, 5, 9, 5, 0, 0, 0, time.UTC)},
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

	m, err := NewMongoDB(dbCTX, "mongodb://192.168.64.21:27017/")
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
			if err := m.CreateBillingTimeSeriesIfNotExist(); err != nil {
				t.Errorf("failed to create billing time series: error = %v", err)
			}
			if err := m.SaveBillingsWithAccountBalance(tt.args.accountBalanceSpec); (err != nil) != tt.wantErr {
				t.Errorf("SaveBillingsWithAccountBalance() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestMongoDB_getBillingCollection(t *testing.T) {
	type fields struct {
		Url          string
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
			m := &MongoDB{
				Url:          tt.fields.Url,
				Client:       tt.fields.Client,
				DBName:       tt.fields.DBName,
				MonitorConn:  tt.fields.MonitorConn,
				MeteringConn: tt.fields.MeteringConn,
				BillingConn:  tt.fields.BillingConn,
			}
			if got := m.getBillingCollection(); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("getBillingCollection() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestMongoDB_getMeteringCollection(t *testing.T) {
	type fields struct {
		Url          string
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
			m := &MongoDB{
				Url:          tt.fields.Url,
				Client:       tt.fields.Client,
				DBName:       tt.fields.DBName,
				MonitorConn:  tt.fields.MonitorConn,
				MeteringConn: tt.fields.MeteringConn,
				BillingConn:  tt.fields.BillingConn,
			}
			if got := m.getMeteringCollection(); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("getMeteringCollection() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestMongoDB_getMonitorCollection(t *testing.T) {
	type fields struct {
		Url          string
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
			m := &MongoDB{
				Url:          tt.fields.Url,
				Client:       tt.fields.Client,
				DBName:       tt.fields.DBName,
				MonitorConn:  tt.fields.MonitorConn,
				MeteringConn: tt.fields.MeteringConn,
				BillingConn:  tt.fields.BillingConn,
			}
			if got := m.getMonitorCollection(); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("getMonitorCollection() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestNewMongoDB(t *testing.T) {
	type args struct {
		ctx context.Context
		URL string
	}
	tests := []struct {
		name    string
		args    args
		want    *MongoDB
		wantErr bool
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := NewMongoDB(tt.args.ctx, tt.args.URL)
			if (err != nil) != tt.wantErr {
				t.Errorf("NewMongoDB() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("NewMongoDB() got = %v, want %v", got, tt.want)
			}
		})
	}
}
