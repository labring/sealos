package v1_test

import (
	"testing"
	"time"

	"github.com/labring/sealos/controllers/account/api/v1"
	"github.com/stretchr/testify/assert"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestDebtConstants(t *testing.T) {
	t.Run("test debt status type constants", func(t *testing.T) {
		assert.Equal(t, v1.DebtStatusType("Normal"), v1.DebtStatusNormal)
		assert.Equal(t, v1.DebtStatusType("Small"), v1.DebtStatusSmall)
		assert.Equal(t, v1.DebtStatusType("Medium"), v1.DebtStatusMedium)
		assert.Equal(t, v1.DebtStatusType("Large"), v1.DebtStatusLarge)
	})

	t.Run("test debt period constants", func(t *testing.T) {
		assert.Equal(t, v1.DebtStatusType("NormalPeriod"), v1.NormalPeriod)
		assert.Equal(t, v1.DebtStatusType("WarningPeriod"), v1.WarningPeriod)
		assert.Equal(t, v1.DebtStatusType("ApproachingDeletionPeriod"), v1.ApproachingDeletionPeriod)
		assert.Equal(t, v1.DebtStatusType("ImminentDeletionPeriod"), v1.ImminentDeletionPeriod)
		assert.Equal(t, v1.DebtStatusType("FinalDeletionPeriod"), v1.FinalDeletionPeriod)
	})

	t.Run("test additional period constants", func(t *testing.T) {
		assert.Equal(t, v1.DebtStatusType("PreWarningPeriod"), v1.PreWarningPeriod)
		assert.Equal(t, v1.DebtStatusType("SuspendPeriod"), v1.SuspendPeriod)
		assert.Equal(t, v1.DebtStatusType("RemovedPeriod"), v1.RemovedPeriod)
	})

	t.Run("test balance period constants", func(t *testing.T) {
		assert.Equal(t, v1.DebtStatusType("LowBalancePeriod"), v1.LowBalancePeriod)
		assert.Equal(t, v1.DebtStatusType("CriticalBalancePeriod"), v1.CriticalBalancePeriod)
		assert.Equal(t, v1.DebtStatusType("DebtPeriod"), v1.DebtPeriod)
		assert.Equal(t, v1.DebtStatusType("DebtDeletionPeriod"), v1.DebtDeletionPeriod)
	})

	t.Run("test namespace annotation status constants", func(t *testing.T) {
		assert.Equal(t, "Normal", v1.NormalDebtNamespaceAnnoStatus)
		assert.Equal(t, "Suspend", v1.SuspendDebtNamespaceAnnoStatus)
		assert.Equal(t, "SuspendCompleted", v1.SuspendCompletedDebtNamespaceAnnoStatus)
		assert.Equal(t, "FinalDeletion", v1.FinalDeletionDebtNamespaceAnnoStatus)
		assert.Equal(t, "FinalDeletionCompleted", v1.FinalDeletionCompletedDebtNamespaceAnnoStatus)
		assert.Equal(t, "Resume", v1.ResumeDebtNamespaceAnnoStatus)
		assert.Equal(t, "ResumeCompleted", v1.ResumeCompletedDebtNamespaceAnnoStatus)
		assert.Equal(t, "TerminateSuspend", v1.TerminateSuspendDebtNamespaceAnnoStatus)
		assert.Equal(t, "TerminateSuspendCompleted", v1.TerminateSuspendCompletedDebtNamespaceAnnoStatus)
	})
}

func TestDebtTypes(t *testing.T) {
	t.Run("test debt spec", func(t *testing.T) {
		spec := v1.DebtSpec{
			UserName: "testuser",
			UserID:   "123",
		}

		assert.Equal(t, "testuser", spec.UserName)
		assert.Equal(t, "123", spec.UserID)
	})

	t.Run("test debt status", func(t *testing.T) {
		now := metav1.Now()
		status := v1.DebtStatus{
			LastUpdateTimestamp: time.Now().Unix(),
			DebtStatusRecords: []v1.DebtStatusRecord{
				{
					LastStatus:    v1.DebtStatusNormal,
					CurrentStatus: v1.DebtStatusSmall,
					UpdateTime:    now,
				},
			},
			AccountDebtStatus: v1.DebtStatusSmall,
		}

		assert.NotZero(t, status.LastUpdateTimestamp)
		assert.Len(t, status.DebtStatusRecords, 1)
		assert.Equal(t, v1.DebtStatusNormal, status.DebtStatusRecords[0].LastStatus)
		assert.Equal(t, v1.DebtStatusSmall, status.DebtStatusRecords[0].CurrentStatus)
		assert.Equal(t, now, status.DebtStatusRecords[0].UpdateTime)
		assert.Equal(t, v1.DebtStatusSmall, status.AccountDebtStatus)
	})

	t.Run("test debt object", func(t *testing.T) {
		debt := &v1.Debt{
			TypeMeta: metav1.TypeMeta{
				Kind:       "Debt",
				APIVersion: "account.sealos.io/v1",
			},
			ObjectMeta: metav1.ObjectMeta{
				Name:      "test-debt",
				Namespace: "default",
			},
			Spec: v1.DebtSpec{
				UserName: "testuser",
				UserID:   "123",
			},
		}

		assert.Equal(t, "Debt", debt.TypeMeta.Kind)
		assert.Equal(t, "account.sealos.io/v1", debt.TypeMeta.APIVersion)
		assert.Equal(t, "test-debt", debt.Name)
		assert.Equal(t, "default", debt.Namespace)
		assert.Equal(t, "testuser", debt.Spec.UserName)
		assert.Equal(t, "123", debt.Spec.UserID)
	})

	t.Run("test debt list", func(t *testing.T) {
		debtList := &v1.DebtList{
			TypeMeta: metav1.TypeMeta{
				Kind:       "DebtList",
				APIVersion: "account.sealos.io/v1",
			},
			Items: []v1.Debt{
				{
					Spec: v1.DebtSpec{
						UserName: "user1",
						UserID:   "123",
					},
				},
				{
					Spec: v1.DebtSpec{
						UserName: "user2",
						UserID:   "456",
					},
				},
			},
		}

		assert.Equal(t, "DebtList", debtList.TypeMeta.Kind)
		assert.Equal(t, "account.sealos.io/v1", debtList.TypeMeta.APIVersion)
		assert.Len(t, debtList.Items, 2)
		assert.Equal(t, "user1", debtList.Items[0].Spec.UserName)
		assert.Equal(t, "user2", debtList.Items[1].Spec.UserName)
	})
}
