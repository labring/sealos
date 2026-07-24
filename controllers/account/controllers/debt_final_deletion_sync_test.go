package controllers

import (
	"testing"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
)

func TestFinalDeletionDebtNamespaceFlushReq(t *testing.T) {
	userUID := uuid.New()

	req := finalDeletionDebtNamespaceFlushReq(userUID)

	if req.UserUID != userUID {
		t.Fatalf("expected user uid %s, got %s", userUID, req.UserUID)
	}
	if req.LastDebtStatus != types.DebtDeletionPeriod {
		t.Fatalf(
			"expected last debt status %s, got %s",
			types.DebtDeletionPeriod,
			req.LastDebtStatus,
		)
	}
	if req.CurrentDebtStatus != types.FinalDeletionPeriod {
		t.Fatalf(
			"expected current debt status %s, got %s",
			types.FinalDeletionPeriod,
			req.CurrentDebtStatus,
		)
	}
}
