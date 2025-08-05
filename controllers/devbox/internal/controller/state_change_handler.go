package controller

import (
	"context"
	"fmt"
	"time"

	"github.com/go-logr/logr"
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
	NodeName            string

	Logger   logr.Logger
	Client   client.Client
	Scheme   *runtime.Scheme
	Recorder record.EventRecorder
}

// todo: handle state change event
func (h *StateChangeHandler) Handle(ctx context.Context, event *corev1.Event) error {
	h.Logger.Info("StateChangeHandler.Handle called",
		"event", event.Name,
		"eventSourceHost", event.Source.Host,
		"handlerNodeName", h.NodeName,
		"eventType", event.Type,
		"eventReason", event.Reason,
		"eventMessage", event.Message)

	if event.Source.Host != h.NodeName {
		h.Logger.Info("event source host is not the node name, skip", "event", event)
		return nil
	}
	devbox := &devboxv1alpha1.Devbox{}
	if err := h.Client.Get(ctx, types.NamespacedName{Namespace: event.Namespace, Name: event.InvolvedObject.Name}, devbox); err != nil {
		h.Logger.Error(err, "failed to get devbox", "devbox", event.InvolvedObject.Name)
		return err
	}
	switch devbox.Status.State {
	case devboxv1alpha1.DevboxStateRunning:
		switch devbox.Spec.State {
		case devboxv1alpha1.DevboxStateStopped:
			// do not commit, update devbox status state to stopped
			devbox.Status.State = devboxv1alpha1.DevboxStateStopped
			h.Logger.Info("update devbox status from running to stopped", "devbox", devbox.Name)
			if err := h.Client.Status().Update(ctx, devbox); err != nil {
				h.Logger.Error(err, "failed to update devbox status", "devbox", devbox.Name)
				return err
			}
		case devboxv1alpha1.DevboxStateShutdown:
			// do commit, update devbox commit record, update devbox status state to shutdown, add a new commit record for the new content id
			// step 1: do commit
			baseImage := devbox.Status.CommitRecords[devbox.Status.ContentID].BaseImage
			commitImage := devbox.Status.CommitRecords[devbox.Status.ContentID].CommitImage
			h.Logger.Info("commit devbox", "devbox", devbox.Name, "baseImage", baseImage, "commitImage", commitImage)
			if _, err := h.Committer.Commit(ctx, devbox.Name, devbox.Status.ContentID, baseImage, commitImage); err != nil {
				h.Logger.Error(err, "failed to commit devbox", "devbox", devbox.Name)
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
				BaseImage:    commitImage,
				CommitImage:  h.generateImageName(devbox),
				GenerateTime: metav1.Now(),
			}
			h.Logger.Info("update devbox status from running to shutdown", "devbox", devbox.Name)
			if err := h.Client.Status().Update(ctx, devbox); err != nil {
				h.Logger.Error(err, "failed to update devbox status", "devbox", devbox.Name)
				return err
			}
		}
	case devboxv1alpha1.DevboxStateStopped:
		switch devbox.Spec.State {
		case devboxv1alpha1.DevboxStateRunning:
			// do not commit, update devbox status state to running
			devbox.Status.State = devboxv1alpha1.DevboxStateRunning
			h.Logger.Info("update devbox status from stopped to running", "devbox", devbox.Name)
			if err := h.Client.Status().Update(ctx, devbox); err != nil {
				h.Logger.Error(err, "failed to update devbox status", "devbox", devbox.Name)
				return err
			}
		case devboxv1alpha1.DevboxStateShutdown:
			// do commit, update devbox commit record, update devbox status state to shutdown, add a new commit record for the new content id
			// step 1: do commit
			baseImage := devbox.Status.CommitRecords[devbox.Status.ContentID].BaseImage
			commitImage := devbox.Status.CommitRecords[devbox.Status.ContentID].CommitImage
			h.Logger.Info("commit devbox", "devbox", devbox.Name, "baseImage", baseImage, "commitImage", commitImage)
			if _, err := h.Committer.Commit(ctx, devbox.Name, devbox.Status.ContentID, baseImage, commitImage); err != nil {
				h.Logger.Error(err, "failed to commit devbox", "devbox", devbox.Name)
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
				BaseImage:    commitImage,
				CommitImage:  h.generateImageName(devbox),
				GenerateTime: metav1.Now(),
			}
			h.Logger.Info("update devbox status from stopped to shutdown", "devbox", devbox.Name)
			if err := h.Client.Status().Update(ctx, devbox); err != nil {
				h.Logger.Error(err, "failed to update devbox status", "devbox", devbox.Name)
				return err
			}
		}
	case devboxv1alpha1.DevboxStateShutdown:
		switch devbox.Spec.State {
		case devboxv1alpha1.DevboxStateRunning:
			// do not commit, update devbox status state to running
			devbox.Status.State = devboxv1alpha1.DevboxStateRunning
			h.Logger.Info("update devbox status from shutdown to running", "devbox", devbox.Name)
			if err := h.Client.Status().Update(ctx, devbox); err != nil {
				h.Logger.Error(err, "failed to update devbox status", "devbox", devbox.Name)
				return err
			}
		case devboxv1alpha1.DevboxStateStopped:
			// do nothing, shutdown state is not allowed to be changed to stopped state
			h.Recorder.Eventf(devbox, corev1.EventTypeWarning, "Shutdown state is not allowed to be changed to stopped state", "Shutdown state is not allowed to be changed to stopped state")
			h.Logger.Error(fmt.Errorf("shutdown state is not allowed to be changed to stopped state"), "shutdown state is not allowed to be changed to stopped state", "devbox", devbox.Name)
			return fmt.Errorf("shutdown state is not allowed to be changed to stopped state")
		}
	}
	return nil
}

func (h *StateChangeHandler) generateImageName(devbox *devboxv1alpha1.Devbox) string {
	now := time.Now()
	return fmt.Sprintf("%s/%s/%s:%s-%s", h.CommitImageRegistry, devbox.Namespace, devbox.Name, rand.String(5), now.Format("2006-01-02-150405"))
}
