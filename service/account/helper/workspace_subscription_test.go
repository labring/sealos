package helper

import (
	"context"
	"testing"

	"github.com/labring/sealos/controllers/pkg/types"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	types2 "k8s.io/apimachinery/pkg/types"
	clientfake "sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestSuspendWorkspaceTrafficAfterZeroAllowance(t *testing.T) {
	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		t.Fatalf("add core API to scheme: %v", err)
	}
	namespace := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: "zero-traffic-workspace",
			Annotations: map[string]string{
				types.NetworkStatusAnnoKey: types.NetworkResume,
			},
		},
	}
	client := clientfake.NewClientBuilder().WithScheme(scheme).WithObjects(namespace).Build()
	sub := &types.WorkspaceSubscription{
		Workspace:     namespace.Name,
		TrafficStatus: types.WorkspaceTrafficStatusActive,
	}

	if err := suspendWorkspaceTrafficAfterZeroAllowance(client, sub); err != nil {
		t.Fatalf("suspendWorkspaceTrafficAfterZeroAllowance() error = %v", err)
	}
	if sub.TrafficStatus != types.WorkspaceTrafficStatusUsedUp {
		t.Fatalf("want traffic status used_up, got %s", sub.TrafficStatus)
	}

	updated := &corev1.Namespace{}
	if err := client.Get(
		context.Background(),
		types2.NamespacedName{Name: namespace.Name},
		updated,
	); err != nil {
		t.Fatalf("get updated namespace: %v", err)
	}
	if updated.Annotations[types.NetworkStatusAnnoKey] != types.NetworkSuspend {
		t.Fatalf(
			"want network status %s, got %s",
			types.NetworkSuspend,
			updated.Annotations[types.NetworkStatusAnnoKey],
		)
	}
}
