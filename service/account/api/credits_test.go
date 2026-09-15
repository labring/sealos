package api

import (
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/service/account/dao"
)

func Test_getCreditsInfo(t *testing.T) {
	if os.Getenv("RUN_ACCOUNT_EXTERNAL_TESTS") != "true" {
		t.Skip("set RUN_ACCOUNT_EXTERNAL_TESTS=true to run account external tests")
	}
	for _, name := range []string{"GLOBAL_COCKROACH_URI", "LOCAL_COCKROACH_URI", "LOCAL_REGION"} {
		if os.Getenv(name) == "" {
			t.Skipf("requires %s", name)
		}
	}
	userUID, err := uuid.Parse("03c7ef29-4556-4f5d-a54b-969f315658a3")
	if err != nil {
		t.Fatalf("failed to parse UUID: %v", err)
	}
	dao.DBClient, err = dao.NewAccountForTest(
		"",
		os.Getenv("GLOBAL_COCKROACH_URI"),
		os.Getenv("LOCAL_COCKROACH_URI"),
	)
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
