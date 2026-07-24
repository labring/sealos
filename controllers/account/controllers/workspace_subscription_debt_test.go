package controllers

import (
	"context"
	"testing"
	"time"

	"github.com/go-logr/logr"
	notificationv1 "github.com/labring/sealos/controllers/pkg/notification/api/v1"
	"github.com/labring/sealos/controllers/pkg/types"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/validation"
	"sigs.k8s.io/controller-runtime/pkg/client"
	clientfake "sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestWorkspaceSubscriptionDebtStatusSyncsNamespaceAnnotations(t *testing.T) {
	tests := []struct {
		name               string
		expiredFor         time.Duration
		expectedStatus     types.SubscriptionStatus
		expectedDebtStatus string
	}{
		{
			name:               "recent expiration suspends workspace",
			expiredFor:         time.Hour,
			expectedStatus:     types.SubscriptionStatusDebt,
			expectedDebtStatus: types.SuspendDebtNamespaceAnnoStatus,
		},
		{
			name:               "debt over grace period stays suspended before deletion",
			expiredFor:         time.Duration(ExpiredGracePeriodHours+1) * time.Hour,
			expectedStatus:     types.SubscriptionStatusDebtPreDeletion,
			expectedDebtStatus: types.SuspendDebtNamespaceAnnoStatus,
		},
		{
			name:               "debt over final deletion period marks workspace for deletion",
			expiredFor:         time.Duration(FinalDeletionPeriodHours+1) * time.Hour,
			expectedStatus:     types.SubscriptionStatusDebtFinalDeletion,
			expectedDebtStatus: types.FinalDeletionDebtNamespaceAnnoStatus,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			namespace := "test-workspace"
			processor := newWorkspaceSubscriptionDebtTestProcessor(t, &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: namespace,
				},
			})

			now := time.Now().UTC()
			expireTime := now.Add(-tt.expiredFor)
			subscription := &types.WorkspaceSubscription{
				PlanName:             "Free",
				Workspace:            namespace,
				RegionDomain:         "test.example.com",
				Status:               types.SubscriptionStatusDebt,
				CurrentPeriodStartAt: expireTime.Add(-30 * 24 * time.Hour),
				CurrentPeriodEndAt:   expireTime,
				CancelAtPeriodEnd:    false,
				CreateAt:             now.Add(-60 * 24 * time.Hour),
				UpdateAt:             now,
			}

			currentStatus := processor.determineCurrentStatus(subscription.CurrentPeriodEndAt)
			if currentStatus != tt.expectedStatus {
				t.Fatalf("expected current status %s, got %s", tt.expectedStatus, currentStatus)
			}

			if err := processor.syncWorkspaceDebtStatus(ctx, subscription, subscription.Status, currentStatus, []string{namespace}); err != nil {
				t.Fatalf("sync workspace debt status failed: %v", err)
			}

			var updatedNS corev1.Namespace
			if err := processor.Get(ctx, client.ObjectKey{Name: namespace}, &updatedNS); err != nil {
				t.Fatalf("failed to get updated namespace: %v", err)
			}

			if got := updatedNS.Annotations[types.DebtNamespaceAnnoStatusKey]; got != tt.expectedDebtStatus {
				t.Fatalf("expected debt annotation %s, got %s", tt.expectedDebtStatus, got)
			}
			if got := updatedNS.Annotations[types.WorkspaceSubscriptionStatusAnnoKey]; got != tt.expectedDebtStatus {
				t.Fatalf(
					"expected workspace subscription annotation %s, got %s",
					tt.expectedDebtStatus,
					got,
				)
			}

			var notice notificationv1.Notification
			if err := processor.Get(ctx, client.ObjectKey{
				Name:      workspaceDebtNoticeName(tt.expectedStatus),
				Namespace: namespace,
			}, &notice); err != nil {
				t.Fatalf("failed to get workspace debt notice: %v", err)
			}
		})
	}
}

func TestWorkspaceDebtNoticeNameIsDNS1123Compatible(t *testing.T) {
	tests := []struct {
		status types.SubscriptionStatus
		want   string
	}{
		{
			status: types.SubscriptionStatusDebt,
			want:   "workspace-debt-debt",
		},
		{
			status: types.SubscriptionStatusDebtPreDeletion,
			want:   "workspace-debt-debt-pre-deletion",
		},
		{
			status: types.SubscriptionStatusDebtFinalDeletion,
			want:   "workspace-debt-debt-final-deletion",
		},
	}

	for _, tt := range tests {
		t.Run(string(tt.status), func(t *testing.T) {
			got := workspaceDebtNoticeName(tt.status)
			if got != tt.want {
				t.Fatalf("expected notice name %s, got %s", tt.want, got)
			}
			if errs := validation.IsDNS1123Subdomain(got); len(errs) > 0 {
				t.Fatalf("expected DNS1123-compatible notice name, got errors: %v", errs)
			}
		})
	}
}

func newWorkspaceSubscriptionDebtTestProcessor(
	t *testing.T,
	objects ...client.Object,
) *WorkspaceSubscriptionDebtProcessor {
	t.Helper()

	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		t.Fatalf("failed to add core scheme: %v", err)
	}
	if err := notificationv1.AddToScheme(scheme); err != nil {
		t.Fatalf("failed to add notification scheme: %v", err)
	}

	fakeClient := clientfake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(objects...).
		Build()

	return &WorkspaceSubscriptionDebtProcessor{
		AccountReconciler: &AccountReconciler{
			Client: fakeClient,
			Logger: logr.Discard(),
		},
	}
}
