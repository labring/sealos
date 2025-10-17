package api

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/service/account/dao"
)

func Test_getCreditsInfo(t *testing.T) {
	userUID, err := uuid.Parse("03c7ef29-4556-4f5d-a54b-969f315658a3")
	if err != nil {
		t.Fatalf("failed to parse UUID: %v", err)
	}
	t.Setenv("LOCAL_REGION", "")
	dao.DBClient, err = dao.NewAccountForTest("", "", "")
	if err != nil {
		t.Fatalf("failed to create DB client: %v", err)
	}

	start := time.Now()
	userCreditsInfo, err := getCreditsInfo(userUID)
	if err != nil {
		t.Fatalf("getCreditsInfo() error = %v", err)
	}

	t.Logf("getCreditsInfo() userCreditsInfo = %#+v, %s", userCreditsInfo, time.Since(start))
}
