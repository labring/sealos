package api

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/dao"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	clientfake "sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestGetOwnNsListWithCltForDebtFlush_IncludesDebtSuspendedNamespacesOnRecovery(t *testing.T) {
	const owner = "test-owner"

	setWorkspaceSubscriptionExistsForTest(t, func(workspace string) (bool, error) {
		return false, nil
	})

	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		t.Fatalf("add core scheme: %v", err)
	}

	clt := clientfake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(
			newTestNamespace("payg", owner, nil),
			newTestNamespace("payg-suspended-with-sub-annotation", owner, map[string]string{
				types.WorkspaceSubscriptionStatusAnnoKey: types.NormalDebtNamespaceAnnoStatus,
				types.DebtNamespaceAnnoStatusKey:         types.SuspendCompletedDebtNamespaceAnnoStatus,
			}),
			newTestNamespace("subscription-active", owner, map[string]string{
				types.WorkspaceSubscriptionStatusAnnoKey: types.NormalDebtNamespaceAnnoStatus,
			}),
			newTestNamespace("other-owner", "other", nil),
		).
		Build()

	ordinaryNamespaces, err := getOwnNsListWithCltForDebtFlush(clt, owner, false)
	if err != nil {
		t.Fatalf("get ordinary namespaces: %v", err)
	}
	assertStringSet(t, ordinaryNamespaces, []string{"payg"})

	recoveryNamespaces, err := getOwnNsListWithCltForDebtFlush(clt, owner, true)
	if err != nil {
		t.Fatalf("get recovery namespaces: %v", err)
	}
	assertStringSet(t, recoveryNamespaces, []string{"payg", "payg-suspended-with-sub-annotation"})

	var ns corev1.Namespace
	if err := clt.Get(context.Background(), client.ObjectKey{Name: "payg-suspended-with-sub-annotation"}, &ns); err != nil {
		t.Fatalf("get suspended namespace: %v", err)
	}
	skip, err := shouldSkipWorkspaceSubscriptionNamespace(ns.Name, ns.Annotations, true)
	if err != nil {
		t.Fatalf("check workspace subscription namespace: %v", err)
	}
	if skip {
		t.Fatal("debt-suspended namespace should be included during recovery")
	}
}

func TestGetOwnNsListWithCltForDebtFlush_SkipsExistingSubscription(t *testing.T) {
	const owner = "test-owner"

	setWorkspaceSubscriptionExistsForTest(t, func(workspace string) (bool, error) {
		return workspace == "subscription-suspended", nil
	})

	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		t.Fatalf("add core scheme: %v", err)
	}

	clt := clientfake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(
			newTestNamespace("payg", owner, nil),
			newTestNamespace("subscription-suspended", owner, map[string]string{
				types.WorkspaceSubscriptionStatusAnnoKey: types.NormalDebtNamespaceAnnoStatus,
				types.DebtNamespaceAnnoStatusKey:         types.SuspendCompletedDebtNamespaceAnnoStatus,
			}),
		).
		Build()

	recoveryNamespaces, err := getOwnNsListWithCltForDebtFlush(clt, owner, true)
	if err != nil {
		t.Fatalf("get recovery namespaces: %v", err)
	}
	assertStringSet(t, recoveryNamespaces, []string{"payg"})
}

func TestGetOwnNsListWithCltForDebtFlush_ReturnsWorkspaceSubscriptionLookupError(t *testing.T) {
	const owner = "test-owner"

	setWorkspaceSubscriptionExistsForTest(t, func(workspace string) (bool, error) {
		return false, errors.New("lookup failed")
	})

	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		t.Fatalf("add core scheme: %v", err)
	}

	clt := clientfake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(
			newTestNamespace("payg-suspended-with-sub-annotation", owner, map[string]string{
				types.WorkspaceSubscriptionStatusAnnoKey: types.NormalDebtNamespaceAnnoStatus,
				types.DebtNamespaceAnnoStatusKey:         types.SuspendCompletedDebtNamespaceAnnoStatus,
			}),
		).
		Build()

	_, err := getOwnNsListWithCltForDebtFlush(clt, owner, true)
	if err == nil {
		t.Fatal("expected workspace subscription lookup error")
	}
	if !strings.Contains(err.Error(), "lookup failed") {
		t.Fatalf("expected lookup error, got %v", err)
	}
}

func TestIsDebtRecoveryTransition(t *testing.T) {
	if !isDebtRecoveryTransition(types.DebtPeriod, types.NormalPeriod) {
		t.Fatal("debt to normal should be a recovery transition")
	}
	if !isDebtRecoveryTransition(types.DebtDeletionPeriod, types.CriticalBalancePeriod) {
		t.Fatal("debt deletion to critical balance should be a recovery transition")
	}
	if isDebtRecoveryTransition(types.NormalPeriod, types.DebtPeriod) {
		t.Fatal("normal to debt should not be a recovery transition")
	}
	if isDebtRecoveryTransition(types.DebtPeriod, types.DebtDeletionPeriod) {
		t.Fatal("debt to debt should not be a recovery transition")
	}
}

func setWorkspaceSubscriptionExistsForTest(t *testing.T, fn func(workspace string) (bool, error)) {
	t.Helper()
	old := workspaceSubscriptionExists
	workspaceSubscriptionExists = fn
	t.Cleanup(func() {
		workspaceSubscriptionExists = old
	})
}

func newTestNamespace(name, owner string, annotations map[string]string) *corev1.Namespace {
	return &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: name,
			Labels: map[string]string{
				dao.UserOwnerLabel: owner,
			},
			Annotations: annotations,
		},
	}
}

func assertStringSet(t *testing.T, got, want []string) {
	t.Helper()
	gotSet := make(map[string]struct{}, len(got))
	for _, item := range got {
		gotSet[item] = struct{}{}
	}
	if len(gotSet) != len(want) {
		t.Fatalf("got namespaces %v, want %v", got, want)
	}
	for _, item := range want {
		if _, ok := gotSet[item]; !ok {
			t.Fatalf("got namespaces %v, want %v", got, want)
		}
	}
}
