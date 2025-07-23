package controller

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	devboxv1alpha1 "github.com/labring/sealos/controllers/devbox/api/v1alpha1"
	"github.com/labring/sealos/controllers/devbox/internal/commit"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/rand"
	"k8s.io/client-go/tools/record"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type StateChangeHandler struct {
	Committer           commit.Committer
	CommitImageRegistry string

	Client   client.Client
	Scheme   *runtime.Scheme
	Recorder record.EventRecorder
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
			devbox.Status.State = devboxv1alpha1.DevboxStateStopped
			if err := h.Client.Status().Update(ctx, devbox); err != nil {
				return err
			}
		case devboxv1alpha1.DevboxStateShutdown:
			// do commit, update devbox commit record, update devbox status state to shutdown, add a new commit record for the new content id
			// step 1: do commit
			targetImage := devbox.Status.CommitRecords[devbox.Status.ContentID].Image
			if err := h.Committer.Commit(ctx, devbox.Name, targetImage); err != nil {
				return err
			}
			// step 2: update devbox commit record
			devbox.Status.CommitRecords[devbox.Status.ContentID].CommitStatus = devboxv1alpha1.CommitStatusSuccess
			devbox.Status.CommitRecords[devbox.Status.ContentID].CommitTime = metav1.Now()
			// step 3: update devbox status state to shutdown
			devbox.Status.State = devboxv1alpha1.DevboxStateShutdown
			// step 4: add a new commit record for the new content id
			// make sure that always have a new commit record for shutdown state
			devbox.Status.ContentID = uuid.New().String()
			devbox.Status.CommitRecords[devbox.Status.ContentID] = &devboxv1alpha1.CommitRecord{
				CommitStatus: devboxv1alpha1.CommitStatusPending,
				Node:         "",
				Image:        h.generateImageName(devbox),
				GenerateTime: metav1.Now(),
			}
			if err := h.Client.Status().Update(ctx, devbox); err != nil {
				return err
			}
		}
	case devboxv1alpha1.DevboxStateStopped:
		switch devbox.Spec.State {
		case devboxv1alpha1.DevboxStateRunning:
			// do not commit, update devbox status state to running
			devbox.Status.State = devboxv1alpha1.DevboxStateRunning
			if err := h.Client.Status().Update(ctx, devbox); err != nil {
				return err
			}
		case devboxv1alpha1.DevboxStateShutdown:
			// do commit, update devbox commit record, update devbox status state to shutdown
			devbox.Status.State = devboxv1alpha1.DevboxStateShutdown
			targetImage := devbox.Status.CommitRecords[devbox.Status.ContentID].Image
			if err := h.Committer.Commit(ctx, devbox.Name, targetImage); err != nil {
				return err
			}
			devbox.Status.CommitRecords[devbox.Status.ContentID].CommitStatus = devboxv1alpha1.CommitStatusSuccess
			devbox.Status.CommitRecords[devbox.Status.ContentID].CommitTime = metav1.Now()
			if err := h.Client.Status().Update(ctx, devbox); err != nil {
				return err
			}
		}
	case devboxv1alpha1.DevboxStateShutdown:
		switch devbox.Spec.State {
		case devboxv1alpha1.DevboxStateRunning:
			// do not commit, update devbox status state to running
			devbox.Status.State = devboxv1alpha1.DevboxStateRunning
			if err := h.Client.Status().Update(ctx, devbox); err != nil {
				return err
			}
		case devboxv1alpha1.DevboxStateStopped:
			// do nothing, shutdown state is not allowed to be changed to stopped state
			h.Recorder.Eventf(devbox, corev1.EventTypeWarning, "Shutdown state is not allowed to be changed to stopped state", "Shutdown state is not allowed to be changed to stopped state")
			return nil
		}
	}
	return nil
}

func (h *StateChangeHandler) generateImageName(devbox *devboxv1alpha1.Devbox) string {
	now := time.Now()
	return fmt.Sprintf("%s/%s/%s:%s-%s", h.CommitImageRegistry, devbox.Namespace, devbox.Name, rand.String(5), now.Format("2006-01-02-150405"))
}
