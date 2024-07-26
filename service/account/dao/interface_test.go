package dao

import (
	"context"
	"encoding/json"
	"os"
	"testing"
	"time"

	"github.com/labring/sealos/service/account/helper"

	"github.com/labring/sealos/controllers/pkg/types"
)

func TestCockroach_GetPayment(t *testing.T) {
	db, err := newAccountForTest("", os.Getenv("GLOBAL_COCKROACH_URI"), os.Getenv("LOCAL_COCKROACH_URI"))
	if err != nil {
		t.Fatalf("NewAccountInterface() error = %v", err)
		return
	}
	got, err := db.GetPayment(types.UserQueryOpts{Owner: "1fgtm0mn"}, time.Time{}, time.Time{})
	if err != nil {
		t.Fatalf("GetPayment() error = %v", err)
		return
	}
	t.Logf("got = %+v", got)
}

func TestMongoDB_GetAppCosts(t *testing.T) {
	db, err := newAccountForTest(os.Getenv("MONGO_URI"), "", "")
	if err != nil {
		t.Fatalf("NewAccountInterface() error = %v", err)
		return
	}
	appCosts, err := db.GetAppCosts(&helper.AppCostsReq{
		UserBaseReq: helper.UserBaseReq{
			TimeRange: helper.TimeRange{
				StartTime: time.Now().Add(-24 * time.Hour * 30),
				EndTime:   time.Now(),
			},
			Auth: &helper.Auth{
				Owner: "xxx",
			},
		},
		Namespace: "ns-xxx",
		AppType:   "APP",
		AppName:   "xxx",
		Page:      72,
		PageSize:  10,
	})
	if err != nil {
		t.Fatalf("GetAppCosts() error = %v", err)
		return
	}
	t.Logf("appCosts = %+v", appCosts)
}

func TestCockroach_GetTransfer(t *testing.T) {
	os.Setenv("LOCAL_REGION", "97925cb0-c8e2-4d52-8b39-d8bf0cbb414a")

	db, err := newAccountForTest("", os.Getenv("GLOBAL_COCKROACH_URI"), os.Getenv("LOCAL_COCKROACH_URI"))
	if err != nil {
		t.Fatalf("NewAccountInterface() error = %v", err)
		return
	}
	transfer, err := db.GetTransfer(&types.GetTransfersReq{
		UserQueryOpts: &types.UserQueryOpts{
			Owner: "q0xeg9z1",
		},
		Type: 0,
		LimitReq: types.LimitReq{
			Page:     1,
			PageSize: 10,
			TimeRange: types.TimeRange{
				StartTime: time.Now().UTC().Add(-1*time.Hour - 30*time.Minute),
				EndTime:   time.Now().UTC(),
			},
		},
	})
	if err != nil {
		t.Fatalf("GetTransfer() error = %v", err)
		return
	}
	t.Logf("timerange = %+v", types.TimeRange{
		StartTime: time.Now().UTC().Add(-30*time.Hour - 30*time.Minute),
		EndTime:   time.Now().UTC(),
	})
	t.Logf("transfer = %+v", transfer.LimitResp)
}

func TestMongoDB_GetCostAppList(t *testing.T) {
	dbCTX := context.Background()
	m, err := newAccountForTest(os.Getenv("MONGO_URI"), "", "")
	if err != nil {
		t.Fatalf("NewAccountInterface() error = %v", err)
		return
	}
	defer func() {
		if err = m.Disconnect(dbCTX); err != nil {
			t.Errorf("failed to disconnect mongo: error = %v", err)
		}
	}()
	req := helper.GetCostAppListReq{
		Auth: &helper.Auth{
			Owner: "5uxfy8jl",
		},
		//Namespace: "ns-hwhbg4vf",
		//AppType: "APP-STORE",
		//AppName: "cronicle-ldokpaus",
		LimitReq: helper.LimitReq{
			Page:     1,
			PageSize: 5,
		},
	}
	appList, err := m.GetCostAppList(req)
	if err != nil {
		t.Fatalf("failed to get cost app list: %v", err)
	}
	t.Logf("len costAppList: %v", len(appList.Apps))
	t.Logf("costAppList: %#+v", appList)
	b, err := json.MarshalIndent(appList, "", "  ")
	if err != nil {
		t.Fatalf("failed to marshal cost app list: %v", err)
	}
	t.Logf("costAppList json: %s", string(b))
}

func TestMongoDB_GetCostOverview(t *testing.T) {
	dbCTX := context.Background()
	m, err := newAccountForTest(os.Getenv("MONGO_URI"), "", "")
	if err != nil {
		t.Fatalf("NewAccountInterface() error = %v", err)
		return
	}
	defer func() {
		if err = m.Disconnect(dbCTX); err != nil {
			t.Errorf("failed to disconnect mongo: error = %v", err)
		}
	}()
	req := helper.GetCostAppListReq{
		Auth: &helper.Auth{
			Owner: "5uxfy8jl",
		},
		//Namespace: "ns-hwhbg4vf",
		//AppType: "APP-STORE",
		//AppName: "cronicle-ldokpaus",
		LimitReq: helper.LimitReq{
			Page:     1,
			PageSize: 5,
		},
	}
	appList, err := m.GetCostOverview(req)
	if err != nil {
		t.Fatalf("failed to get cost app list: %v", err)
	}
	t.Logf("len costAppList: %v", len(appList.Overviews))
	t.Logf("costAppList: %#+v", appList)

	// 转json
	b, err := json.MarshalIndent(appList, "", "  ")
	if err != nil {
		t.Fatalf("failed to marshal cost app list: %v", err)
	}
	t.Logf("costoverview json: %s", string(b))
}

func TestUnmarshal_Config(t *testing.T) {
	cfg := &Config{
		LocalRegionDomain: "localRegionDomain",
		Regions: []Region{
			{
				Domain:     "192.168.0.55.nip.io",
				AccountSvc: "account-api.192.168.0.55.nip.io",
				UID:        "97925cb0-c8e2-4d52-8b39-d8bf0cbb414a",
				Name: map[string]string{
					"zh": "区域A",
					"en": "region-a",
				},
			},
			{
				Domain:     "192.168.0.75.nip.io",
				AccountSvc: "account-api.192.168.0.75.nip.io",
				UID:        "b373c0e9-7bf1-4d64-b863-bc604a4801ad",
				Name: map[string]string{
					"zh": "区域B",
					"en": "region-b",
				},
			},
		},
	}
	b, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		t.Fatalf("failed to marshal config: %v", err)
	}
	t.Logf("config json: \n%s", string(b))
}

func TestMongoDB_GetBasicCostDistribution(t *testing.T) {
	dbCTX := context.Background()
	m, err := newAccountForTest(os.Getenv("MONGO_URI"), "", "")
	if err != nil {
		t.Fatalf("NewAccountInterface() error = %v", err)
		return
	}
	defer func() {
		if err = m.Disconnect(dbCTX); err != nil {
			t.Errorf("failed to disconnect mongo: error = %v", err)
		}
	}()
	req := helper.GetCostAppListReq{
		Auth: &helper.Auth{
			Owner: "5uxfy8jl",
		},
		//Namespace: "ns-hwhbg4vf",
		AppType: "APP-STORE",
		//AppName: "cronicle-ldokpaus",
		LimitReq: helper.LimitReq{
			Page:     1,
			PageSize: 5,
		},
	}
	appList, err := m.GetBasicCostDistribution(req)
	if err != nil {
		t.Fatalf("failed to get cost app list: %v", err)
	}
	t.Logf("costAppList: %v", appList)
}

func TestMongoDB_GetAppCostTimeRange(t *testing.T) {
	dbCTX := context.Background()
	m, err := newAccountForTest(os.Getenv("MONGO_URI"), "", "")
	if err != nil {
		t.Fatalf("NewAccountInterface() error = %v", err)
		return
	}
	defer func() {
		if err = m.Disconnect(dbCTX); err != nil {
			t.Errorf("failed to disconnect mongo: error = %v", err)
		}
	}()
	req := helper.GetCostAppListReq{
		Auth: &helper.Auth{
			Owner: "5uxfy8jl",
		},
		//Namespace: "ns-hwhbg4vf",
		//AppType: "APP-STORE",
		AppType: "DB",
		AppName: "test",
		LimitReq: helper.LimitReq{
			Page:     1,
			PageSize: 5,
		},
	}
	timeRange, err := m.GetAppCostTimeRange(req)
	if err != nil {
		t.Fatalf("failed to get cost app list: %v", err)
	}
	t.Logf("costAppList: %v", timeRange)
}
