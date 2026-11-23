package api

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	clientfake "sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestIsWorkspaceSubscriptionNamespaceRecoverable(t *testing.T) {
	cases := []struct {
		name        string
		phase       corev1.NamespacePhase
		annotations map[string]string
		deleting    bool
		want        bool
	}{
		{
			name:  "active namespace",
			phase: corev1.NamespaceActive,
			want:  true,
		},
		{
			name:  "active suspended namespace can be resumed",
			phase: corev1.NamespaceActive,
			annotations: map[string]string{
				types.DebtNamespaceAnnoStatusKey: types.SuspendCompletedDebtNamespaceAnnoStatus,
			},
			want: true,
		},
		{
			name:  "final deletion in progress",
			phase: corev1.NamespaceActive,
			annotations: map[string]string{
				types.DebtNamespaceAnnoStatusKey: types.FinalDeletionDebtNamespaceAnnoStatus,
			},
		},
		{
			name:  "final deletion completed",
			phase: corev1.NamespaceActive,
			annotations: map[string]string{
				types.DebtNamespaceAnnoStatusKey: types.FinalDeletionCompletedDebtNamespaceAnnoStatus,
			},
		},
		{
			name:  "terminate suspend in progress",
			phase: corev1.NamespaceActive,
			annotations: map[string]string{
				types.DebtNamespaceAnnoStatusKey: types.TerminateSuspendDebtNamespaceAnnoStatus,
			},
		},
		{
			name:  "terminate suspend completed",
			phase: corev1.NamespaceActive,
			annotations: map[string]string{
				types.DebtNamespaceAnnoStatusKey: types.TerminateSuspendCompletedDebtNamespaceAnnoStatus,
			},
		},
		{
			name:  "unknown debt status",
			phase: corev1.NamespaceActive,
			annotations: map[string]string{
				types.DebtNamespaceAnnoStatusKey: "Unknown",
			},
		},
		{
			name:     "namespace has deletion timestamp",
			phase:    corev1.NamespaceActive,
			deleting: true,
		},
		{
			name:  "namespace is terminating",
			phase: corev1.NamespaceTerminating,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			scheme := runtime.NewScheme()
			if err := corev1.AddToScheme(scheme); err != nil {
				t.Fatalf("add core scheme: %v", err)
			}

			ns := &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name:        "ns-test",
					Annotations: tt.annotations,
				},
				Status: corev1.NamespaceStatus{Phase: tt.phase},
			}
			if tt.deleting {
				ns.Finalizers = []string{"kubernetes"}
				deletionTimestamp := metav1.NewTime(time.Now().UTC())
				ns.DeletionTimestamp = &deletionTimestamp
			}

			clt := clientfake.NewClientBuilder().
				WithScheme(scheme).
				WithObjects(ns).
				Build()
			got, err := isWorkspaceSubscriptionNamespaceRecoverable(
				context.Background(),
				clt,
				"ns-test",
			)
			if err != nil {
				t.Fatalf("check namespace recoverability: %v", err)
			}
			if got != tt.want {
				t.Fatalf("recoverable = %v, want %v", got, tt.want)
			}
		})
	}

	t.Run("missing namespace", func(t *testing.T) {
		scheme := runtime.NewScheme()
		if err := corev1.AddToScheme(scheme); err != nil {
			t.Fatalf("add core scheme: %v", err)
		}
		clt := clientfake.NewClientBuilder().WithScheme(scheme).Build()
		got, err := isWorkspaceSubscriptionNamespaceRecoverable(
			context.Background(),
			clt,
			"missing",
		)
		if err != nil {
			t.Fatalf("check missing namespace: %v", err)
		}
		if got {
			t.Fatal("missing namespace must not be recoverable")
		}
	})
}

func TestIsValidDeletedWorkspaceSubscriptionResubscription(t *testing.T) {
	workspaceSubscription := &types.WorkspaceSubscription{
		ID:           uuid.New(),
		Workspace:    "ns-test",
		RegionDomain: "example.com",
		PlanName:     "pro",
		Status:       types.SubscriptionStatusDeleted,
		Stripe: &types.StripePay{
			SubscriptionID: "sub-old",
		},
	}
	transaction := &types.WorkspaceSubscriptionTransaction{
		Workspace:     "ns-test",
		RegionDomain:  "example.com",
		OldPlanName:   "pro",
		OldPlanStatus: types.SubscriptionStatusDeleted,
		Operator:      types.SubscriptionTransactionTypeCreated,
		Status:        types.SubscriptionTransactionStatusProcessing,
		PayStatus:     types.SubscriptionPayStatusPending,
	}

	if !isValidDeletedWorkspaceSubscriptionResubscription(
		workspaceSubscription,
		transaction,
		"sub-new",
	) {
		t.Fatal("expected current deleted workspace resubscription to be valid")
	}

	cases := []struct {
		name   string
		mutate func(*types.WorkspaceSubscription, *types.WorkspaceSubscriptionTransaction)
	}{
		{
			name: "old stripe subscription event",
			mutate: func(ws *types.WorkspaceSubscription, _ *types.WorkspaceSubscriptionTransaction) {
				ws.Stripe.SubscriptionID = "sub-new"
			},
		},
		{
			name: "completed transaction",
			mutate: func(_ *types.WorkspaceSubscription, tx *types.WorkspaceSubscriptionTransaction) {
				tx.Status = types.SubscriptionTransactionStatusCompleted
			},
		},
		{
			name: "wrong operator",
			mutate: func(_ *types.WorkspaceSubscription, tx *types.WorkspaceSubscriptionTransaction) {
				tx.Operator = types.SubscriptionTransactionTypeRenewed
			},
		},
		{
			name: "wrong old status",
			mutate: func(_ *types.WorkspaceSubscription, tx *types.WorkspaceSubscriptionTransaction) {
				tx.OldPlanStatus = types.SubscriptionStatusDebt
			},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			ws := *workspaceSubscription
			ws.Stripe = &types.StripePay{SubscriptionID: "sub-old"}
			tx := *transaction
			tt.mutate(&ws, &tx)
			if isValidDeletedWorkspaceSubscriptionResubscription(&ws, &tx, "sub-new") {
				t.Fatal("expected invalid deleted workspace resubscription")
			}
		})
	}
}

func TestIsDeletedWorkspaceSubscriptionResubscriptionPayment(t *testing.T) {
	if !isDeletedWorkspaceSubscriptionResubscriptionPayment(
		true,
		types.SubscriptionTransactionTypeCreated,
	) {
		t.Fatal("expected an initial created payment to be a deleted workspace resubscription")
	}

	cases := []struct {
		name     string
		initial  bool
		operator types.SubscriptionOperator
	}{
		{
			name:     "old subscription cycle with created metadata",
			initial:  false,
			operator: types.SubscriptionTransactionTypeCreated,
		},
		{
			name:     "initial payment with renewal operator",
			initial:  true,
			operator: types.SubscriptionTransactionTypeRenewed,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			if isDeletedWorkspaceSubscriptionResubscriptionPayment(tt.initial, tt.operator) {
				t.Fatal("expected payment not to be treated as a deleted workspace resubscription")
			}
		})
	}
}
