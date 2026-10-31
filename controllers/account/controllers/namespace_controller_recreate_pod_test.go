package controllers

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/go-logr/logr"
	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/watch"
	"sigs.k8s.io/controller-runtime/pkg/client"
	clientfake "sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func makeOrphanPod(name string, finalizers []string) *corev1.Pod {
	return &corev1.Pod{
		ObjectMeta: v1.ObjectMeta{
			Name:       name,
			Namespace:  "ns-attacker",
			Finalizers: finalizers,
		},
		Spec: corev1.PodSpec{
			NodeName:      "worker-1",
			SchedulerName: "",
			Containers:    []corev1.Container{{Name: "c", Image: "example.invalid/app:v1"}},
		},
	}
}

// A tenant-registered finalizer on an orphan pod must not stall the
// suspension worker: the finalizer is stripped and the pod is replaced by the
// unschedulable debt-scheduler clone.
func TestSuspendOrphanPodStripsFinalizersAndCompletes(t *testing.T) {
	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		t.Fatalf("failed to add core scheme: %v", err)
	}
	fakeClient := clientfake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(
			makeOrphanPod("finalized", []string{"tenant.example/hold"}),
			makeOrphanPod("ordinary", nil),
		).
		Build()
	r := &NamespaceReconciler{Client: fakeClient, Log: logr.Discard()}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	done := make(chan error, 1)
	go func() { done <- r.suspendOrphanPod(ctx, "ns-attacker") }()

	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("suspendOrphanPod failed: %v", err)
		}
	case <-time.After(9 * time.Second):
		t.Fatal("suspendOrphanPod wedged on a finalizer-held pod")
	}

	podList := corev1.PodList{}
	if err := fakeClient.List(ctx, &podList, client.InNamespace("ns-attacker")); err != nil {
		t.Fatalf("list pods: %v", err)
	}
	if len(podList.Items) != 2 {
		t.Fatalf("expected the two recreated clones, got %d pods", len(podList.Items))
	}
	for _, pod := range podList.Items {
		if pod.Spec.SchedulerName != accountv1.DebtSchedulerName {
			t.Fatalf(
				"pod %s was not recreated with the debt scheduler: %q",
				pod.Name,
				pod.Spec.SchedulerName,
			)
		}
		if pod.Spec.NodeName != "" {
			t.Fatalf("recreated pod %s kept its node binding %q", pod.Name, pod.Spec.NodeName)
		}
		if pod.Finalizers != nil {
			t.Fatalf("recreated pod %s kept finalizers %v", pod.Name, pod.Finalizers)
		}
	}
}

// When the watch stream ends without a Deleted event (server-side watch
// timeout, connection drop) the failure must surface as an error instead of a
// silent success.
func TestRecreatePodWatchCloseWithoutDeletedReturnsError(t *testing.T) {
	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		t.Fatalf("failed to add core scheme: %v", err)
	}
	inner := clientfake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(makeOrphanPod("ordinary", nil)).
		Build()
	r := &NamespaceReconciler{Client: &closedWatchClient{WithWatch: inner}, Log: logr.Discard()}

	oldPod := makeOrphanPod("ordinary", nil)
	clone := oldPod.DeepCopy()
	clone.ResourceVersion = ""
	clone.Spec.NodeName = ""
	clone.Spec.SchedulerName = accountv1.DebtSchedulerName

	err := r.recreatePod(context.Background(), *oldPod, clone)
	if err == nil {
		t.Fatal("recreatePod must fail when the watch closes without a Deleted event")
	}
	if !strings.Contains(err.Error(), "ended before the pod was deleted") {
		t.Fatalf("unexpected error: %v", err)
	}
}

// If the finalizer strip itself fails, the suspension must fail loudly (and
// requeue) rather than block or report success.
func TestSuspendOrphanPodSurfacesFinalizerStripFailure(t *testing.T) {
	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		t.Fatalf("failed to add core scheme: %v", err)
	}
	inner := clientfake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(makeOrphanPod("finalized", []string{"tenant.example/hold"})).
		Build()
	r := &NamespaceReconciler{Client: &patchFailClient{WithWatch: inner}, Log: logr.Discard()}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	done := make(chan error, 1)
	go func() { done <- r.suspendOrphanPod(ctx, "ns-attacker") }()

	select {
	case err := <-done:
		if err == nil || !strings.Contains(err.Error(), "remove finalizers") {
			t.Fatalf("expected finalizer-strip failure to surface, got %v", err)
		}
	case <-time.After(9 * time.Second):
		t.Fatal("suspendOrphanPod wedged instead of surfacing the strip failure")
	}
}

// closedWatchClient wraps a client so every Watch returns an immediately
// closed stream (the server closing the connection).
type closedWatchClient struct {
	client.WithWatch
}

func (c *closedWatchClient) Watch(
	_ context.Context, _ client.ObjectList, _ ...client.ListOption,
) (watch.Interface, error) {
	return closedWatcher{}, nil
}

type closedWatcher struct{}

func (closedWatcher) Stop() {}

func (closedWatcher) ResultChan() <-chan watch.Event {
	ch := make(chan watch.Event)
	close(ch)
	return ch
}

// patchFailClient wraps a client whose Patch always fails, simulating a
// racing tenant or API error during the finalizer strip.
type patchFailClient struct {
	client.WithWatch
}

func (c *patchFailClient) Patch(
	_ context.Context, _ client.Object, _ client.Patch, _ ...client.PatchOption,
) error {
	return apierrors.NewConflict(
		corev1.Resource("pods"), "patch", errors.New("patch refused"),
	)
}
