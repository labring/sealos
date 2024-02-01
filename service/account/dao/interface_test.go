package dao

import (
	"testing"
	"time"

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
