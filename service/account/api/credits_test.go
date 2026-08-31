package api

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
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

func Test_buildCreditsInfo(t *testing.T) {
	freePlanID := uuid.New().String()
	paidPlanID := uuid.New().String()
	expireAt := time.Date(2026, 9, 20, 0, 0, 0, 0, time.UTC)
	startAt := expireAt.AddDate(0, -1, 0)

	rows := []types.Credits{
		{
			Amount:     500000,
			UsedAmount: 280000,
			FromID:     freePlanID,
			StartAt:    startAt,
			ExpireAt:   expireAt,
			Status:     types.CreditsStatusActive,
		},
		{
			Amount:     220000,
			UsedAmount: 220000,
			FromID:     paidPlanID,
			Status:     types.CreditsStatusUsedUp,
		},
	}

	info := buildCreditsInfo(rows, paidPlanID, freePlanID, "pro")

	if info.Credits != 720000 || info.DeductionCredits != 500000 {
		t.Fatalf("totals = %d/%d, want 720000/500000", info.Credits, info.DeductionCredits)
	}
	if info.KYCDeductionCreditsBalance != 500000 ||
		info.KYCDeductionCreditsDeductionBalance != 280000 {
		t.Fatalf(
			"kyc pair = %d/%d, want 500000/280000",
			info.KYCDeductionCreditsBalance,
			info.KYCDeductionCreditsDeductionBalance,
		)
	}

	// The list must cover exactly the aggregated rows, exhausted ones included.
	if len(info.CreditsList) != 2 {
		t.Fatalf("len(CreditsList) = %d, want 2", len(info.CreditsList))
	}
	var listAmount, listUsed int64
	for _, item := range info.CreditsList {
		listAmount += item.Amount
		listUsed += item.UsedAmount
	}
	if listAmount != info.Credits || listUsed != info.DeductionCredits {
		t.Fatalf(
			"list sums %d/%d do not match totals %d/%d",
			listAmount, listUsed, info.Credits, info.DeductionCredits,
		)
	}

	if info.CreditsList[0].ExpireAt == nil ||
		!info.CreditsList[0].ExpireAt.Equal(expireAt) {
		t.Fatalf("ExpireAt = %v, want %v", info.CreditsList[0].ExpireAt, expireAt)
	}
	if info.CreditsList[1].ExpireAt != nil || info.CreditsList[1].StartAt != nil {
		t.Fatalf("zero times must serialize as nil, got %#v", info.CreditsList[1])
	}
	if info.CreditsList[1].Status != types.CreditsStatusUsedUp {
		t.Fatalf("Status = %q, want %q", info.CreditsList[1].Status, types.CreditsStatusUsedUp)
	}
}

func Test_buildCreditsInfo_FreePlanCopiesKYCPair(t *testing.T) {
	freePlanID := uuid.New().String()
	rows := []types.Credits{
		{
			Amount:     100000,
			UsedAmount: 40000,
			FromID:     freePlanID,
			Status:     types.CreditsStatusActive,
		},
	}

	// On the Free plan the current plan IS the free plan, so the row lands in
	// the current-plan pair and must be copied to the KYC pair.
	info := buildCreditsInfo(rows, freePlanID, freePlanID, types.FreeSubscriptionPlanName)

	if info.KYCDeductionCreditsBalance != 100000 ||
		info.KYCDeductionCreditsDeductionBalance != 40000 {
		t.Fatalf(
			"kyc pair = %d/%d, want 100000/40000",
			info.KYCDeductionCreditsBalance,
			info.KYCDeductionCreditsDeductionBalance,
		)
	}
}

func Test_buildCreditsInfo_EmptyListSerializesAsArray(t *testing.T) {
	info := buildCreditsInfo(nil, uuid.New().String(), uuid.New().String(), "pro")
	raw, err := json.Marshal(info)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if !strings.Contains(string(raw), `"creditsList":[]`) {
		t.Fatalf(`want "creditsList":[] in output, got %s`, raw)
	}
}
