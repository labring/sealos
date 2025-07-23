package controller

import (
	"context"

	devboxv1alpha1 "github.com/labring/sealos/controllers/devbox/api/v1alpha1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/tools/record"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type StateChangeHandler struct {
	Client      client.Client
	Scheme      *runtime.Scheme
	Recorder    record.EventRecorder
	Broadcaster record.EventBroadcaster
}

// todo: handle state change event
func (h *StateChangeHandler) Handle(ctx context.Context, event *corev1.Event) error {
	devbox := &devboxv1alpha1.Devbox{}
	if err := h.Client.Get(ctx, types.NamespacedName{Namespace: event.Namespace, Name: event.InvolvedObject.Name}, devbox); err != nil {
		return err
	}
	switch devbox.Status.State {
	case devboxv1alpha1.DevboxStateRunning:
		switch devbox.Spec.State {
		case devboxv1alpha1.DevboxStateStopped:
			// do not commit, update devbox status state to stopped
		case devboxv1alpha1.DevboxStateShutdown:
			// do commit, update devbox commit record, update devbox status state to shutdown
		}
	case devboxv1alpha1.DevboxStateStopped:
		switch devbox.Spec.State {
		case devboxv1alpha1.DevboxStateRunning:
			// do not commit, update devbox status state to running
		case devboxv1alpha1.DevboxStateShutdown:
			// do commit, update devbox commit record, update devbox status state to shutdown
		}
	case devboxv1alpha1.DevboxStateShutdown:
		switch devbox.Spec.State {
		case devboxv1alpha1.DevboxStateRunning:
			// do not commit, create a new commit record, update devbox status state to running
		case devboxv1alpha1.DevboxStateStopped:
			// do nothing, shutdown state is not allowed to be changed to stopped state
		}
	}

	return nil
}
