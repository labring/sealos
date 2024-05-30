package dao

import (
	"testing"
	"time"

	"github.com/labring/sealos/service/account/helper"

	"github.com/labring/sealos/controllers/pkg/types"
)

func TestCockroach_GetPayment(t *testing.T) {
	db, err := NewAccountInterface("", "", "")
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
	db, err := NewAccountInterface("", "", "")
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
			Auth: helper.Auth{
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
