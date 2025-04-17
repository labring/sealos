package dao

import (
	"context"
	"encoding/json"
	"fmt"
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
	got, resp, err := db.GetPayment(&types.UserQueryOpts{Owner: "1fgtm0mn"}, &helper.GetPaymentReq{})
	if err != nil {
		t.Fatalf("GetPayment() error = %v", err)
		return
	}
	t.Logf("got = %+v", got)
	t.Logf("limit resp = %+v", resp)
}

func TestMongoDB_GetAppCosts(t *testing.T) {
	db, err := newAccountForTest(os.Getenv("MONGO_URI"), "", "")
	if err != nil {
		t.Fatalf("NewAccountInterface() error = %v", err)
		return
	}
	appCosts, err := db.GetAppCosts(&helper.AppCostsReq{
		UserTimeRangeReq: helper.UserTimeRangeReq{
			TimeRange: helper.TimeRange{
				StartTime: time.Now().Add(-24 * time.Hour * 30),
				EndTime:   time.Now(),
			},
			AuthBase: helper.AuthBase{
				Auth: &helper.Auth{
					Owner: "5uxfy8jl",
				},
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
		AuthBase: helper.AuthBase{
			Auth: &helper.Auth{
				Owner: "E1xAJ0fy4k",
			},
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
		AuthBase: helper.AuthBase{
			Auth: &helper.Auth{
				Owner: "E1xAJ0fy4k",
			},
		},
		//Namespace: "ns-hwhbg4vf",
		//AppType: "APP",
		//AppName: "hello-world",
	}

	/*
	     "overviews": [
	       {
	         "amount": 605475,
	         "namespace": "ns-5uxfy8jl",
	         "regionDomain": "",
	         "appType": 2,
	         "appName": "hello-world"
	       },
	       {
	         "amount": 4030,
	         "namespace": "ns-5uxfy8jl",
	         "regionDomain": "",
	         "appType": 1,
	         "appName": "wordpress-nwdzwqkv-mysql"
	       },
	       {
	         "amount": 544983,
	         "namespace": "ns-5uxfy8jl",
	         "regionDomain": "",
	         "appType": 1,
	         "appName": "test"
	       },
	       {
	         "amount": 8057,
	         "namespace": "ns-5uxfy8jl",
	         "regionDomain": "",
	         "appType": 2,
	         "appName": "wordpress-nwdzwqkv"
	       },
	       {
	         "amount": 805435,
	         "namespace": "ns-5uxfy8jl",
	         "regionDomain": "",
	         "appType": 8,
	         "appName": "wordpress-nwdzwqkv"
	       },
	       {
	         "amount": 1083138,
	         "namespace": "ns-5uxfy8jl",
	         "regionDomain": "",
	         "appType": 8,
	         "appName": "rustdesk-ijhdszru"
	       }
	     ],
	     "total": 6,
	     "totalPage": 1
	   }

	*/

	for _, appType := range []string{"", "DB", "APP", "APP-STORE", "TERMINAL", "JOB"} {
		req.AppType = appType
		for i := 1; i <= 10; i++ {
			for j := 1; j <= 10; j++ {
				req.LimitReq = helper.LimitReq{
					Page:     i,
					PageSize: j,
				}
				appList, err := m.GetCostOverview(req)
				if err != nil {
					t.Fatalf("failed to get cost app list: %v", err)
				}
				if len(appList.Overviews) != GetCurrentPageItemCount(int(appList.Total), j, i) {
					fmt.Printf("limit: %#+v\n", req.LimitReq)
					fmt.Printf("total: %v\n", appList.Total)
					t.Fatalf("len costAppList: %v, not equal getPageCount: %v", len(appList.Overviews), GetCurrentPageItemCount(int(appList.Total), j, i))
				}

				t.Logf("len costAppList: %v", len(appList.Overviews))
				//t.Logf("costAppList: %#+v", appList)

				// 转json
				if len(appList.Overviews) != 0 {
					b, err := json.MarshalIndent(appList, "", "  ")
					if err != nil {
						t.Fatalf("failed to marshal cost app list: %v", err)
					}
					t.Logf("costoverview json: %s", string(b))
				}
				t.Logf("success: %#+v", req.LimitReq)
			}
		}
	}

	//req.LimitReq = helper.LimitReq{
	//	Page:     2,
	//	PageSize: 2,
	//}
	////req.AppType = "APP-STORE"
	//req.AppName = "rustdesk-ijhdszru"
	//appList, err := m.GetCostOverview(req)
	//if err != nil {
	//	t.Fatalf("failed to get cost app list: %v", err)
	//}
	//if len(appList.Overviews) != GetCurrentPageItemCount(int(appList.Total), req.PageSize, req.Page) {
	//	fmt.Printf("limit: %#+v\n", req.LimitReq)
	//	fmt.Printf("total: %v\n", appList.Total)
	//	t.Fatalf("len costAppList: %v, not equal getPageCount: %v", len(appList.Overviews), GetCurrentPageItemCount(int(appList.Total), 2, 1))
	//}
	//
	//t.Logf("len costAppList: %v", len(appList.Overviews))
	////t.Logf("costAppList: %#+v", appList)
	//
	//// 转json
	//if len(appList.Overviews) != 0 {
	//	b, err := json.MarshalIndent(appList, "", "  ")
	//	if err != nil {
	//		t.Fatalf("failed to marshal cost app list: %v", err)
	//	}
	//	t.Logf("costoverview json: %s", string(b))
	//}
	//t.Logf("success: %#+v", req.LimitReq)
}

func GetCurrentPageItemCount(totalItems, pageSize, currentPage int) int {
	if totalItems <= 0 || pageSize <= 0 || currentPage <= 0 {
		return 0
	}

	if pageSize >= totalItems {
		if currentPage == 1 {
			return totalItems
		}
		return 0
	}

	totalPages := (totalItems + pageSize - 1) / pageSize

	if currentPage > totalPages {
		return 0
	}

	if currentPage == totalPages {
		return totalItems - (totalPages-1)*pageSize
	}

	return pageSize
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
		AuthBase: helper.AuthBase{
			Auth: &helper.Auth{
				Owner: "5uxfy8jl",
			},
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
		AuthBase: helper.AuthBase{
			Auth: &helper.Auth{
				Owner: "5uxfy8jl",
			},
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

func TestMongoDB_GetConsumptionAmount(t *testing.T) {
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
		AuthBase: helper.AuthBase{
			Auth: &helper.Auth{
				Owner: "5uxfy8jl",
			},
		},
		Namespace: "ns-uy771xun",
		AppType:   "APP-STORE",
		AppName:   "wordpress-nljzdohs",
		LimitReq: helper.LimitReq{
			TimeRange: helper.TimeRange{
				StartTime: time.Now().Add(-24 * time.Hour * 300),
				EndTime:   time.Now(),
			},
			PageSize: 20,
			Page:     1,
		},
	}
	costs, err := m.GetCostOverview(req)
	if err != nil {
		t.Fatalf("failed to get cost app list: %v", err)
	}
	t.Logf("GetCostOverview: %v", costs)
	amountAll := int64(0)
	for _, cost := range costs.Overviews {
		amountAll += cost.Amount
	}
	t.Logf("amountAll: %v", amountAll)
	amount2, err := m.GetConsumptionAmount(helper.ConsumptionRecordReq{
		AuthBase: helper.AuthBase{
			Auth: &helper.Auth{
				Owner: req.Owner,
			},
		},
		TimeRange: helper.TimeRange{
			StartTime: req.StartTime,
			EndTime:   req.EndTime,
		},
		Namespace: req.Namespace,
		AppType:   req.AppType,
		AppName:   req.AppName,
	})
	if err != nil {
		t.Fatalf("failed to get cost app list: %v", err)
	}
	t.Logf("GetConsumptionAmount: %v", amount2)
}

func TestMongoDB_GetAppCost1(t *testing.T) {
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
	req := &helper.AppCostsReq{
		UserTimeRangeReq: helper.UserTimeRangeReq{
			TimeRange: helper.TimeRange{
				StartTime: time.Now().Add(-24 * time.Hour * 30),
				EndTime:   time.Now(),
			},
			AuthBase: helper.AuthBase{
				Auth: &helper.Auth{
					Owner: "5uxfy8jl",
				},
			},
		},
		//Namespace: "ns-hwhbg4vf",
		//AppType: "APP",
		//AppName: "hello-world",
		Page:     1,
		PageSize: 10,
	}

	//for _, appType := range []string{"", "DB", "APP", "APP-STORE", "TERMINAL", "JOB"} {
	//	req.AppType = appType
	//	for i := 1; i <= 30; i++ {
	//		for j := 1; j <= 30; j++ {
	//			req.Page = i
	//			req.PageSize = j
	//			appList, err := m.GetAppCosts(req)
	//			if err != nil {
	//				t.Fatalf("failed to get cost app list: %v", err)
	//			}
	//			if len(appList.Costs) != GetCurrentPageItemCount(appList.TotalRecords, j, i) {
	//				fmt.Printf("page: %d, pageSize: %d\n", req.Page, req.PageSize)
	//				fmt.Printf("appType: %s\n", appType)
	//				fmt.Printf("total: %v\n", appList.TotalRecords)
	//				t.Fatalf("len costAppList: %v, not equal getPageCount: %v", len(appList.Costs), GetCurrentPageItemCount(appList.TotalRecords, j, i))
	//			}
	//
	//			t.Logf("len costAppList: %v", len(appList.Costs))
	//			//t.Logf("costAppList: %#+v", appList)
	//
	//			//// 转json
	//			//if len(appList.Costs) != 0 {
	//			//	b, err := json.MarshalIndent(appList, "", "  ")
	//			//	if err != nil {
	//			//		t.Fatalf("failed to marshal cost app list: %v", err)
	//			//	}
	//			//	t.Logf("costoverview json: %s", string(b))
	//			//}
	//			t.Logf("success: apptype %s, page: %d, pagesize: %d, total: %d", req.AppType, req.Page, req.PageSize, appList.TotalRecords)
	//		}
	//	}
	//}

	req.Page = 1
	req.PageSize = 10
	req.AppType = "APP-STORE"
	req.AppName = ""
	appList, err := m.GetAppCosts(req)
	if err != nil {
		t.Fatalf("failed to get cost app list: %v", err)
	}
	t.Logf("costAppList: %#+v", appList)
}

func TestAccount_ApplyInvoice(t *testing.T) {
	dbCTX := context.Background()
	m, err := newAccountForTest(os.Getenv("MONGO_URI"), os.Getenv("GLOBAL_COCKROACH_URI"), os.Getenv("LOCAL_COCKROACH_URI"))
	if err != nil {
		t.Fatalf("NewAccountInterface() error = %v", err)
		return
	}
	defer func() {
		if err = m.Disconnect(dbCTX); err != nil {
			t.Errorf("failed to disconnect mongo: error = %v", err)
		}
	}()
	req := &helper.ApplyInvoiceReq{
		AuthBase: helper.AuthBase{
			Auth: &helper.Auth{
				Owner:  "5uxfy8jl",
				UserID: "Vobqe43JUs",
			},
		},
		PaymentIDList: []string{
			"vrCBsLt1oIf0",
			"uro7KQmUp1bD",
			"85M_N42NID_S",
			"o6qZ7qk6wNRl",
		},
		Detail: "jsonxxxx",
	}
	_, _, err = m.ApplyInvoice(req)
	if err != nil {
		t.Fatalf("failed to apply invoice: %v", err)
	}
	t.Logf("success to apply invoice")

	invoice, resp, err := m.GetInvoice(&helper.GetInvoiceReq{
		AuthBase: helper.AuthBase{
			Auth: &helper.Auth{
				Owner:  "E1xAJ0fy4k",
				UserID: "",
			},
		},
		LimitReq: helper.LimitReq{
			Page:     1,
			PageSize: 10,
		},
	})
	if err != nil {
		t.Fatalf("failed to get invoice: %v", err)
	}
	t.Logf("invoice: %#+v", invoice)
	t.Logf("resp: %#+v", resp)
}

func TestAccount_SetStatusInvoice(t *testing.T) {
	dbCTX := context.Background()
	m, err := newAccountForTest(os.Getenv("MONGO_URI"), os.Getenv("GLOBAL_COCKROACH_URI"), os.Getenv("LOCAL_COCKROACH_URI"))
	if err != nil {
		t.Fatalf("NewAccountInterface() error = %v", err)
		return
	}
	defer func() {
		if err = m.Disconnect(dbCTX); err != nil {
			t.Errorf("failed to disconnect mongo: error = %v", err)
		}
	}()
	err = m.SetStatusInvoice(&helper.SetInvoiceStatusReq{
		InvoiceIDList: []string{"8WKSA0ECYhSr", "M0Y0dyUhdX9S"},
		Status:        types.PendingInvoiceStatus,
	})
	if err != nil {
		t.Fatalf("failed to set status invoice: %v", err)
	}
}

func TestAccount_UseGiftCode(t *testing.T) {
	db, err := newAccountForTest("", os.Getenv("GLOBAL_COCKROACH_URI"), os.Getenv("LOCAL_COCKROACH_URI"))
	if err != nil {
		t.Fatalf("NewAccountInterface() error = %v", err)
		return
	}

	giftcode, err := db.UseGiftCode(&helper.UseGiftCodeReq{
		Code: "d-intl-TXERVADC3ASAGQJSx",
		AuthBase: helper.AuthBase{
			Auth: &helper.Auth{
				UserID: "E1xAJ0fy4k",
			},
		},
	})

	if err != nil {
		t.Fatalf("UseGiftCode() error = %v", err)
		return
	}
	t.Logf("giftcode = %+v", giftcode)
}

func TestAccount_GetUserRealNameInfo(t *testing.T) {
	db, err := newAccountForTest("", os.Getenv("GLOBAL_COCKROACH_URI"), os.Getenv("LOCAL_COCKROACH_URI"))
	if err != nil {
		t.Fatalf("NewAccountInterface() error = %v", err)
		return
	}

	userRealNameInfo, err := db.GetUserRealNameInfo(&helper.GetRealNameInfoReq{
		AuthBase: helper.AuthBase{
			Auth: &helper.Auth{
				UserID: "E1xAJ0fy4k",
			},
		},
	})

	if err != nil {
		t.Fatalf("GetUserRealNameInfo() error = %v", err)
		return
	}
	t.Logf("userRealNameInfo = %+v", userRealNameInfo)
}

func TestAccount_GetEnterpriseRealNameInfo(t *testing.T) {
	db, err := newAccountForTest("", os.Getenv("GLOBAL_COCKROACH_URI"), os.Getenv("LOCAL_COCKROACH_URI"))
	if err != nil {
		t.Fatalf("NewAccountInterface() error = %v", err)
		return
	}

	enterpriseRealNameInfo, err := db.GetEnterpriseRealNameInfo(&helper.GetRealNameInfoReq{
		AuthBase: helper.AuthBase{
			Auth: &helper.Auth{
				UserID: "E1xAJ0fy4k",
			},
		},
	})

	if err != nil {
		t.Fatalf("GetUserRealNameInfo() error = %v", err)
		return
	}
	t.Logf("enterpriseRealNameInfo = %+v", enterpriseRealNameInfo)
}

func init() {
	// set env
	os.Setenv("MONGO_URI", "")
	os.Setenv("GLOBAL_COCKROACH_URI", "")
	os.Setenv("LOCAL_COCKROACH_URI", "")
	os.Setenv("LOCAL_REGION", "")
}

func TestMongoDB_GetMonitorUniqueValues(t *testing.T) {
	db, err := newAccountForTest(os.Getenv("MONGO_URI"), "", "")
	if err != nil {
		t.Fatalf("NewAccountInterface() error = %v", err)
		return
	}
	monitors, err := db.GetMonitorUniqueValues(time.Now().UTC().Add(-2*time.Minute), time.Now().UTC(), []string{"ns-ufbih5nx", "ns-fb3qejql", "ns-pvq1d3ri", "ns-cyvisdnk"})
	if err != nil {
		t.Fatalf("GetMonitorUniqueValues() error = %v", err)
		return
	}
	for _, monitor := range monitors {
		t.Logf("monitor = %+v\n", monitor)
	}
}

func TestAccount_ReconcileUnsettledLLMBilling(t *testing.T) {
	type fields struct {
		MongoDB   *MongoDB
		Cockroach *Cockroach
	}
	tests := []struct {
		name    string
		fields  fields
		wantErr bool
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := &Account{
				MongoDB:   tt.fields.MongoDB,
				Cockroach: tt.fields.Cockroach,
			}
			if err := m.ReconcileUnsettledLLMBilling(time.Now().Add(-1*time.Hour), time.Now()); (err != nil) != tt.wantErr {
				t.Errorf("ReconcileUnsettledLLMBilling() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
