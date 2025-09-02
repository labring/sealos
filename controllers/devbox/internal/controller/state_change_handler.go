package controller

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/go-logr/logr"
	"github.com/google/uuid"
	devboxv1alpha2 "github.com/labring/sealos/controllers/devbox/api/v1alpha2"
	"github.com/labring/sealos/controllers/devbox/internal/commit"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/rand"
	"k8s.io/client-go/tools/record"
	"k8s.io/client-go/util/retry"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

var commitMap = sync.Map{}

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
	devbox := &devboxv1alpha2.Devbox{}
	if err := h.Client.Get(ctx, types.NamespacedName{Namespace: event.Namespace, Name: event.InvolvedObject.Name}, devbox); err != nil {
		h.Logger.Error(err, "failed to get devbox", "devbox", event.InvolvedObject.Name)
		return err
	}
	// Check if state transition is valid and handle accordingly
	currentState := devbox.Status.State
	targetState := devbox.Spec.State

	// Handle invalid state transition
	if currentState == devboxv1alpha2.DevboxStateShutdown && targetState == devboxv1alpha2.DevboxStateStopped {
		h.Recorder.Eventf(devbox, corev1.EventTypeWarning, "Shutdown state is not allowed to be changed to stopped state", "Shutdown state is not allowed to be changed to stopped state")
		h.Logger.Error(fmt.Errorf("shutdown state is not allowed to be changed to stopped state"), "shutdown state is not allowed to be changed to stopped state", "devbox", devbox.Name)
		return fmt.Errorf("shutdown state is not allowed to be changed to stopped state")
	}

	// Handle state transitions that require commit, only running and paused devbox can be shutdown or stopped
	needsCommit := (targetState == devboxv1alpha2.DevboxStateShutdown || targetState == devboxv1alpha2.DevboxStateStopped) &&
		(currentState == devboxv1alpha2.DevboxStateRunning || currentState == devboxv1alpha2.DevboxStatePaused)

	if needsCommit {
		// Check if commit is already in progress to prevent duplicate requests
		if _, ok := commitMap.Load(devbox.Status.ContentID); ok {
			h.Logger.Info("commit already in progress, skipping duplicate request", "devbox", devbox.Name, "contentID", devbox.Status.ContentID)
			return nil
		}
		commitMap.Store(devbox.Status.ContentID, true)
		if err := h.commitDevbox(ctx, devbox, targetState); err != nil {
			commitMap.Delete(devbox.Status.ContentID)
			h.Logger.Error(err, "failed to commit devbox", "devbox", devbox.Name)
			return err
		}
	} else if currentState != targetState {
		// Handle simple state transitions without commit
		devbox.Status.State = targetState
		h.Logger.Info("update devbox status", "devbox", devbox.Name, "from", currentState, "to", targetState)
		if err := h.Client.Status().Update(ctx, devbox); err != nil {
			h.Logger.Error(err, "failed to update devbox status", "devbox", devbox.Name)
			return err
		}
	}
	return nil
}

func (h *StateChangeHandler) commitDevbox(ctx context.Context, devbox *devboxv1alpha2.Devbox, targetState devboxv1alpha2.DevboxState) error {
	defer commitMap.Delete(devbox.Status.ContentID)
	if err := h.Client.Get(ctx, types.NamespacedName{Namespace: devbox.Namespace, Name: devbox.Name}, devbox); err != nil {
		h.Logger.Error(err, "failed to get devbox", "devbox", devbox.Name)
		return err
	}
	// do commit, update devbox commit record, update devbox status state to shutdown, add a new commit record for the new content id
	// step 0: set commit status to committing to prevent duplicate requests
	devbox.Status.CommitRecords[devbox.Status.ContentID].CommitStatus = devboxv1alpha2.CommitStatusCommitting
	devbox.Status.CommitRecords[devbox.Status.ContentID].UpdateTime = metav1.Now()
	if err := h.Client.Status().Update(ctx, devbox); err != nil {
		h.Logger.Error(err, "failed to update commit status to committing", "devbox", devbox.Name)
		return err
	}
	h.Logger.Info("set commit status to committing", "devbox", devbox.Name, "contentID", devbox.Status.ContentID)

	if err := h.Client.Get(ctx, types.NamespacedName{Namespace: devbox.Namespace, Name: devbox.Name}, devbox); err != nil {
		h.Logger.Error(err, "failed to get devbox", "devbox", devbox.Name)
		return err
	}
	// step 1: do commit, push image, remove container whether commit success or not
	baseImage := devbox.Status.CommitRecords[devbox.Status.ContentID].BaseImage
	commitImage := devbox.Status.CommitRecords[devbox.Status.ContentID].CommitImage
	oldContentID := devbox.Status.ContentID
	h.Logger.Info("commit devbox", "devbox", devbox.Name, "baseImage", baseImage, "commitImage", commitImage)
	var containerID string
	var err error
	defer func() {
		// remove container whether commit success or not
		if err := h.Committer.RemoveContainer(ctx, containerID); err != nil {
			h.Logger.Error(err, "failed to remove container", "containerID", containerID)
		}
	}()
	if containerID, err = h.Committer.Commit(ctx, devbox.Name, devbox.Status.ContentID, baseImage, commitImage); err != nil {
		h.Logger.Error(err, "failed to commit devbox", "devbox", devbox.Name)
		// Update commit status to failed on commit error
		devbox.Status.CommitRecords[devbox.Status.ContentID].CommitStatus = devboxv1alpha2.CommitStatusFailed
		devbox.Status.CommitRecords[devbox.Status.ContentID].UpdateTime = metav1.Now()
		if updateErr := h.Client.Status().Update(ctx, devbox); updateErr != nil {
			h.Logger.Error(updateErr, "failed to update commit status to failed", "devbox", devbox.Name)
		}
		return err
	}
	if err := h.Client.Get(ctx, types.NamespacedName{Namespace: devbox.Namespace, Name: devbox.Name}, devbox); err != nil {
		h.Logger.Error(err, "failed to get devbox", "devbox", devbox.Name)
		return err
	}
	if err := h.Committer.Push(ctx, commitImage); err != nil {
		h.Logger.Error(err, "failed to push commit image", "commitImage", commitImage)
		// Update commit status to failed on push error
		devbox.Status.CommitRecords[devbox.Status.ContentID].CommitStatus = devboxv1alpha2.CommitStatusFailed
		devbox.Status.CommitRecords[devbox.Status.ContentID].UpdateTime = metav1.Now()
		if updateErr := h.Client.Status().Update(ctx, devbox); updateErr != nil {
			h.Logger.Error(updateErr, "failed to update commit status to failed", "devbox", devbox.Name)
		}
		return err
	}
	// remove after push image whether push success
	if err := h.Committer.RemoveImage(ctx, commitImage, false, false); err != nil {
		h.Logger.Error(err, "failed to remove image", "commitImage", commitImage)
	}
	// step 2: update devbox commit record
	devbox.Status.CommitRecords[devbox.Status.ContentID].CommitStatus = devboxv1alpha2.CommitStatusSuccess
	devbox.Status.CommitRecords[devbox.Status.ContentID].CommitTime = metav1.Now()
	// step 3: update devbox status state to shutdown
	devbox.Status.State = targetState
	// step 4: add a new commit record for the new content id
	// make sure that always have a new commit record for shutdown state
	devbox.Status.ContentID = uuid.New().String()
	devbox.Status.CommitRecords[devbox.Status.ContentID] = &devboxv1alpha2.CommitRecord{
		CommitStatus: devboxv1alpha2.CommitStatusPending,
		Node:         "",
		BaseImage:    commitImage,
		CommitImage:  h.generateImageName(devbox),
		GenerateTime: metav1.Now(),
	}
	devbox.Status.Node = ""
	h.Logger.Info("update devbox status to shutdown", "devbox", devbox.Name)
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		return h.Client.Status().Update(ctx, devbox)
	}); err != nil {
		h.Logger.Error(err, "failed to update devbox status", "devbox", devbox.Name)
		return err
	}
	// step 5: set lv removable
	if err := h.Committer.SetLvRemovable(ctx, containerID, oldContentID); err != nil {
		h.Logger.Error(err, "failed to set lv removable", "containerID", containerID, "contentID", oldContentID)
	}
	return nil
}

func (h *StateChangeHandler) generateImageName(devbox *devboxv1alpha2.Devbox) string {
	now := time.Now()
	return fmt.Sprintf("%s/%s/%s:%s-%s", h.CommitImageRegistry, devbox.Namespace, devbox.Name, rand.String(5), now.Format("2006-01-02-150405"))
}
