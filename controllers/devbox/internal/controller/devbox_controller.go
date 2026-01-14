/*
Copyright 2024.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package controller

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	devboxv1alpha2 "github.com/labring/sealos/controllers/devbox/api/v1alpha2"
	"github.com/labring/sealos/controllers/devbox/internal/controller/utils/events"
	"github.com/labring/sealos/controllers/devbox/internal/controller/utils/matcher"
	"github.com/labring/sealos/controllers/devbox/internal/controller/utils/resource"
	"github.com/labring/sealos/controllers/devbox/internal/controller/utils/rwords"
	"github.com/labring/sealos/controllers/devbox/internal/stat"
	"github.com/labring/sealos/controllers/devbox/label"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/rand"
	"k8s.io/client-go/tools/record"
	"k8s.io/client-go/util/retry"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

// DevboxReconciler reconciles a Devbox object
type DevboxReconciler struct {
	CommitImageRegistry string
	DevboxNodeLabel     string
	NodeName            string

	RequestRate      resource.RequestRate
	EphemeralStorage resource.EphemeralStorage

	PodMatchers []matcher.PodMatcher

	DebugMode                 bool
	MergeBaseImageTopLayer    bool
	EnableBlockIOResource     bool
	StartupConfigMapName      string
	StartupConfigMapNamespace string

	client.Client
	Scheme              *runtime.Scheme
	Recorder            record.EventRecorder
	StateChangeRecorder record.EventRecorder

	RestartPredicateDuration time.Duration
	AcceptanceThreshold      int
	stat.NodeStatsProvider
}

// +kubebuilder:rbac:groups=devbox.sealos.io,resources=devboxes,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=devbox.sealos.io,resources=devboxes/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=devbox.sealos.io,resources=devboxes/finalizers,verbs=update
// +kubebuilder:rbac:groups=devbox.sealos.io,resources=runtimes,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=devbox.sealos.io,resources=runtimeclasses,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups="",resources=pods,verbs=*
// +kubebuilder:rbac:groups="",resources=pods/status,verbs=get;update;patch
// +kubebuilder:rbac:groups="",resources=nodes,verbs=get;list;watch
// +kubebuilder:rbac:groups="",resources=nodes/status,verbs=get
// +kubebuilder:rbac:groups="",resources=services,verbs=*
// +kubebuilder:rbac:groups="",resources=secrets,verbs=*
// +kubebuilder:rbac:groups="",resources=configmaps,verbs=*
// +kubebuilder:rbac:groups="",resources=events,verbs=*

func (r *DevboxReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := log.FromContext(ctx).WithValues("devbox", req.NamespacedName)

	// 1) Fetch the object. If it's gone, nothing to do.
	devbox := &devboxv1alpha2.Devbox{}
	if err := r.Get(ctx, req.NamespacedName, devbox); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	recLabels := label.RecommendedLabels(&label.Recommended{
		Name:      devbox.Name,
		ManagedBy: label.DefaultManagedBy,
		PartOf:    devboxv1alpha2.LabelDevBoxPartOf,
	})

	logger.Info("start reconciling devbox")
	if r.StartupConfigMapName != "" {
		logger.Info(
			"startup config map set",
			"startupConfigMapName", r.StartupConfigMapName,
			"startupConfigMapNamespace", r.StartupConfigMapNamespace,
		)
	}

	// 2) Deletion flow: make best-effort to delete sub-resources, then remove finalizer.
	if !devbox.DeletionTimestamp.IsZero() {
		return r.reconcileDevboxDeletion(ctx, devbox, recLabels)
	}

	// 3) Ensure finalizer exists (idempotent).
	if err := r.ensureDevboxFinalizer(ctx, req.NamespacedName); err != nil {
		return ctrl.Result{}, err
	}

	// 4) Per-node controller ownership: if another node already owns this devbox, we should not reconcile it.
	if devbox.Status.Node != "" && devbox.Status.Node != r.NodeName {
		logger.Info("devbox already scheduled to another node, skip reconcile", "node", devbox.Status.Node)
		return ctrl.Result{}, nil
	}

	// 5) Initialize status (idempotent). If we updated status, requeue to continue with the persisted status.
	updated, err := r.initDevboxStatus(ctx, devbox)
	if err != nil {
		return ctrl.Result{}, err
	}
	if updated {
		return ctrl.Result{Requeue: true}, nil
	}

	// 6) Validate required status fields for the rest of the flow.
	commitRecord, requeue, err := r.getCurrentCommitRecord(devbox)
	if err != nil {
		return ctrl.Result{}, err
	}
	if requeue {
		logger.Info("commit record is not found, requeue to wait for commit record to be created")
		return ctrl.Result{Requeue: true}, nil
	}

	// 7) Scheduling/claiming ownership (only when running).
	if devbox.Spec.State == devboxv1alpha2.DevboxStateRunning {
		res, err := r.ensureDevboxScheduledToThisNodeIfPossible(ctx, req.NamespacedName, devbox, commitRecord)
		if err != nil {
			return ctrl.Result{}, err
		}
		if res.Requeue || res.RequeueAfter > 0 {
			return res, nil
		}
	}

	// 8) Reconcile desired resources (pods/services/secrets/etc).
	if err := r.runSyncPipeline(ctx, devbox, recLabels); err != nil {
		return ctrl.Result{}, err
	}

	// 9) State transition observability (emit event once per generation).
	if err := r.maybeEmitStateChangeEvent(ctx, devbox); err != nil {
		return ctrl.Result{}, err
	}

	// 10) Keep conditions/ObservedGeneration in sync.
	if err := r.syncDevboxConditions(ctx, devbox); err != nil {
		return ctrl.Result{}, err
	}

	logger.Info("devbox reconcile success")
	return ctrl.Result{}, nil
}

func (r *DevboxReconciler) initDevboxStatus(ctx context.Context, devbox *devboxv1alpha2.Devbox) (updated bool, err error) {
	// only fill missing fields; avoid overriding existing status
	changed := false

	// init devbox status network type
	if devbox.Status.Network.Type == "" {
		devbox.Status.Network.Type = devbox.Spec.NetworkSpec.Type
		changed = true
	}

	// init devbox status content id
	if devbox.Status.ContentID == "" {
		devbox.Status.ContentID = uuid.New().String()
		changed = true
	}
	currentContentID := devbox.Status.ContentID

	// init devbox status commit record map
	if devbox.Status.CommitRecords == nil {
		devbox.Status.CommitRecords = make(map[string]*devboxv1alpha2.CommitRecord)
		changed = true
	}

	// init devbox status commit record for current content id
	if devbox.Status.CommitRecords[currentContentID] == nil {
		devbox.Status.CommitRecords[currentContentID] = &devboxv1alpha2.CommitRecord{
			Node:         "",
			BaseImage:    devbox.Spec.Image,
			CommitImage:  r.generateImageName(devbox),
			CommitStatus: devboxv1alpha2.CommitStatusPending,
			GenerateTime: metav1.Now(),
		}
		changed = true
	}

	// init devbox status state
	if devbox.Status.State == "" {
		devbox.Status.State = devbox.Spec.State
		changed = true
	}

	// init devbox status network unique id
	if devbox.Status.Network.UniqueID == "" {
		devbox.Status.Network.UniqueID = rwords.GenerateRandomWords()
		changed = true
	}

	// update devbox status, and do not return error to avoid infinite loop because multiple controller will reconcile this devbox
	if changed {
		if err := r.Status().Update(ctx, devbox); err != nil {
			return false, err
		}
		return true, nil
	}

	return false, nil
}

// reconcileDevboxDeletion deletes owned resources then removes the devbox finalizer.
func (r *DevboxReconciler) reconcileDevboxDeletion(
	ctx context.Context,
	devbox *devboxv1alpha2.Devbox,
	recLabels map[string]string,
) (ctrl.Result, error) {
	logger := log.FromContext(ctx).WithValues("devbox", client.ObjectKeyFromObject(devbox))

	logger.Info("devbox deleted, remove all resources")
	if err := r.handleSubResourceDelete(ctx, devbox, recLabels); err != nil {
		return ctrl.Result{}, err
	}

	// delete storage:
	if err := r.handleStorageDelete(ctx, devbox); err != nil {
		return ctrl.Result{}, err
	}

	logger.Info("devbox deleted, remove finalizer")
	if controllerutil.RemoveFinalizer(devbox, devboxv1alpha2.FinalizerName) {
		if err := r.Update(ctx, devbox); err != nil {
			return ctrl.Result{}, err
		}
	}
	return ctrl.Result{}, nil
}

// ensureDevboxFinalizer ensures the devbox has the controller finalizer (idempotent).
func (r *DevboxReconciler) ensureDevboxFinalizer(ctx context.Context, key client.ObjectKey) error {
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		latest := &devboxv1alpha2.Devbox{}
		if err := r.Get(ctx, key, latest); err != nil {
			return client.IgnoreNotFound(err)
		}
		if controllerutil.AddFinalizer(latest, devboxv1alpha2.FinalizerName) {
			return r.Update(ctx, latest)
		}
		return nil
	})
}

// getCurrentCommitRecord returns the current commit record.
// If it is missing, caller should requeue (not an error).
func (r *DevboxReconciler) getCurrentCommitRecord(
	devbox *devboxv1alpha2.Devbox,
) (record *devboxv1alpha2.CommitRecord, requeue bool, err error) {
	if devbox.Status.ContentID == "" {
		return nil, true, nil
	}
	if devbox.Status.CommitRecords == nil {
		return nil, true, nil
	}
	rec := devbox.Status.CommitRecords[devbox.Status.ContentID]
	if rec == nil {
		return nil, true, nil
	}
	return rec, false, nil
}

// ensureDevboxScheduledToThisNodeIfPossible tries to claim ownership for a running devbox.
// It returns a ctrl.Result to requeue/slow-requeue when needed.
func (r *DevboxReconciler) ensureDevboxScheduledToThisNodeIfPossible(
	ctx context.Context,
	key client.ObjectKey,
	devbox *devboxv1alpha2.Devbox,
	commitRecord *devboxv1alpha2.CommitRecord,
) (ctrl.Result, error) {
	logger := log.FromContext(ctx).WithValues("devbox", key)

	// If the current content is owned by another node, skip.
	if commitRecord.Node != "" && commitRecord.Node != r.NodeName {
		logger.Info("devbox already scheduled to node", "node", commitRecord.Node)
		return ctrl.Result{}, nil
	}

	// Already ours: continue.
	if commitRecord.Node == r.NodeName {
		return ctrl.Result{}, nil
	}

	// Try to claim ownership when unscheduled.
	score := r.getAcceptanceScore(ctx, devbox)
	if score < r.AcceptanceThreshold {
		logger.Info("devbox not scheduled to node, try scheduling to us later",
			"nodeName", r.NodeName,
			"score", score,
			"acceptanceThreshold", r.AcceptanceThreshold)
		return ctrl.Result{RequeueAfter: 5 * time.Second}, nil
	}

	logger.Info("devbox not scheduled to node, try scheduling to us now",
		"nodeName", r.NodeName,
		"score", score,
		"acceptanceThreshold", r.AcceptanceThreshold)

	claimedByUs := false
	err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		latest := &devboxv1alpha2.Devbox{}
		if err := r.Get(ctx, key, latest); err != nil {
			return err
		}
		if latest.Status.CommitRecords == nil || latest.Status.CommitRecords[latest.Status.ContentID] == nil {
			return fmt.Errorf("commit record missing for contentID %s", latest.Status.ContentID)
		}

		latestRecord := latest.Status.CommitRecords[latest.Status.ContentID]
		// Someone else (or us) already claimed it.
		if latestRecord.Node != "" {
			return nil
		}

		latestRecord.Node = r.NodeName
		latest.Status.Node = r.NodeName
		if err := r.Status().Update(ctx, latest); err != nil {
			return err
		}
		claimedByUs = true
		return nil
	})
	if err != nil {
		return ctrl.Result{}, err
	}

	// If we claimed it, requeue to continue with persisted status and emit event once.
	if claimedByUs {
		r.Recorder.Eventf(
			devbox,
			corev1.EventTypeNormal,
			"Devbox scheduled to node",
			"Devbox scheduled to node",
		)
		return ctrl.Result{Requeue: true}, nil
	}

	// Someone else claimed it; stop reconciling on this node.
	return ctrl.Result{}, nil
}

// maybeEmitStateChangeEvent records state change event once per generation when this node is allowed to sync.
func (r *DevboxReconciler) maybeEmitStateChangeEvent(ctx context.Context, devbox *devboxv1alpha2.Devbox) error {
	logger := log.FromContext(ctx).WithValues("devbox", client.ObjectKeyFromObject(devbox))

	if devbox.Status.CommitRecords == nil || devbox.Status.CommitRecords[devbox.Status.ContentID] == nil {
		return nil
	}

	// Only the node that owns the current content should sync state.
	// Exception: for stop/shutdown transitions, allow syncing when not yet scheduled.
	contentID := devbox.Status.ContentID
	currentRecord := devbox.Status.CommitRecords[contentID]
	ownedByThisNode := currentRecord.Node == r.NodeName
	stopOrShutdown := devbox.Spec.State == devboxv1alpha2.DevboxStateStopped || devbox.Spec.State == devboxv1alpha2.DevboxStateShutdown
	unscheduled := currentRecord.Node == ""
	allowedToSyncState := ownedByThisNode || (stopOrShutdown && unscheduled)
	needsStateTransition := devbox.Spec.State != devbox.Status.State

	if !allowedToSyncState || !needsStateTransition {
		return nil
	}

	shouldEmit, err := r.markStateTransitionPendingAndReturnShouldEmit(ctx, devbox)
	if err != nil {
		return err
	}
	if !shouldEmit {
		return nil
	}

	logger.Info("recording state change event", "nodeName", r.NodeName)
	r.StateChangeRecorder.Eventf(
		devbox,
		corev1.EventTypeNormal,
		events.ReasonDevboxStateChanged,
		"Devbox state changed from %s to %s",
		devbox.Status.State,
		devbox.Spec.State,
	)
	r.Recorder.Eventf(
		devbox,
		corev1.EventTypeNormal,
		events.ReasonDevboxStateChanged,
		"Devbox state changed from %s to %s",
		devbox.Status.State,
		devbox.Spec.State,
	)
	return nil
}

func (r *DevboxReconciler) markStateTransitionPendingAndReturnShouldEmit(
	ctx context.Context,
	devbox *devboxv1alpha2.Devbox,
) (bool, error) {
	var shouldEmit bool
	err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		latest := &devboxv1alpha2.Devbox{}
		if err := r.Get(ctx, client.ObjectKeyFromObject(devbox), latest); err != nil {
			return err
		}

		// If the state is already synced, there's nothing to emit.
		if latest.Spec.State == latest.Status.State {
			shouldEmit = false
			return nil
		}

		existing := latest.GetCondition(devboxv1alpha2.DevboxConditionStateTransitionPending)
		if existing != nil &&
			existing.Status == metav1.ConditionTrue &&
			existing.ObservedGeneration == latest.Generation &&
			existing.Reason == devboxv1alpha2.DevboxReasonSpecStateChanged {
			shouldEmit = false
			return nil
		}

		latest.SetCondition(metav1.Condition{
			Type:               devboxv1alpha2.DevboxConditionStateTransitionPending,
			Status:             metav1.ConditionTrue,
			ObservedGeneration: latest.Generation,
			Reason:             devboxv1alpha2.DevboxReasonSpecStateChanged,
			Message:            "spec.state differs from status.state; state transition pending",
			LastTransitionTime: metav1.Now(),
		})
		shouldEmit = true
		return r.Status().Update(ctx, latest)
	})
	return shouldEmit, err
}

func (r *DevboxReconciler) syncDevboxConditions(ctx context.Context, devbox *devboxv1alpha2.Devbox) error {
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		latest := &devboxv1alpha2.Devbox{}
		if err := r.Get(ctx, client.ObjectKeyFromObject(devbox), latest); err != nil {
			return err
		}

		// Only advance ObservedGeneration when the state transition is fully synced.
		// (Other spec changes are currently reconciled in the same flow; using state
		// as the hard gate avoids reporting a generation as "observed" while a
		// transition is still pending.)
		if latest.Spec.State == latest.Status.State {
			latest.Status.ObservedGeneration = latest.Generation
		}

		// State transition pending condition
		if latest.Spec.State != latest.Status.State {
			latest.SetCondition(metav1.Condition{
				Type:               devboxv1alpha2.DevboxConditionStateTransitionPending,
				Status:             metav1.ConditionTrue,
				ObservedGeneration: latest.Generation,
				Reason:             devboxv1alpha2.DevboxReasonSpecStateChanged,
				Message:            "spec.state differs from status.state; state transition pending",
				LastTransitionTime: metav1.Now(),
			})
		} else {
			latest.SetCondition(metav1.Condition{
				Type:               devboxv1alpha2.DevboxConditionStateTransitionPending,
				Status:             metav1.ConditionFalse,
				ObservedGeneration: latest.Generation,
				Reason:             devboxv1alpha2.DevboxReasonStateTransitionSynced,
				Message:            "spec.state matches status.state",
				LastTransitionTime: metav1.Now(),
			})
		}

		// Commit in progress condition (authoritative record is the current ContentID).
		// Guard against missing commit record to avoid panics.
		var committing bool
		if latest.Status.CommitRecords != nil && latest.Status.ContentID != "" {
			if rec := latest.Status.CommitRecords[latest.Status.ContentID]; rec != nil {
				committing = rec.CommitStatus == devboxv1alpha2.CommitStatusCommitting
			}
		}
		if committing {
			latest.SetCondition(metav1.Condition{
				Type:               devboxv1alpha2.DevboxConditionCommitInProgress,
				Status:             metav1.ConditionTrue,
				ObservedGeneration: latest.Generation,
				Reason:             devboxv1alpha2.DevboxReasonCommitStarted,
				Message:            "commit workflow in progress",
				LastTransitionTime: metav1.Now(),
			})
		} else {
			latest.SetCondition(metav1.Condition{
				Type:               devboxv1alpha2.DevboxConditionCommitInProgress,
				Status:             metav1.ConditionFalse,
				ObservedGeneration: latest.Generation,
				Reason:             devboxv1alpha2.DevboxReasonCommitNotInProgress,
				Message:            "no commit workflow in progress",
				LastTransitionTime: metav1.Now(),
			})
		}

		return r.Status().Update(ctx, latest)
	})
}

func (r *DevboxReconciler) handleStorageDelete(
	ctx context.Context,
	devbox *devboxv1alpha2.Devbox,
) error {
	logger := log.FromContext(ctx)

	// Early return if storage is already cleaned up
	if r.isStorageAlreadyCleanedUp(devbox) {
		logger.Info("devbox storage already cleaned up, skipping cleanup",
			"devbox", devbox.Name,
			"state", devbox.Spec.State)
		return nil
	}

	// Validate and get commit record
	commitRecord, err := r.validateAndGetCommitRecord(devbox)
	if err != nil {
		logger.Error(err, "failed to validate commit record", "devbox", devbox.Name)
		return err
	}
	// Check if this node should handle the cleanup
	if !r.shouldHandleStorageCleanup(commitRecord) {
		logger.Info("skipping storage cleanup - not responsible node",
			"devbox", devbox.Name,
			"commitRecordNode", commitRecord.Node,
			"currentNode", r.NodeName)
		return nil
	}

	// Request storage cleanup
	return r.requestStorageCleanup(ctx, devbox, commitRecord)
}

// isStorageAlreadyCleanedUp checks if storage cleanup is already done
// shutdown or stopped devbox is already cleaned up
func (r *DevboxReconciler) isStorageAlreadyCleanedUp(devbox *devboxv1alpha2.Devbox) bool {
	return devbox.Spec.State == devboxv1alpha2.DevboxStateShutdown ||
		devbox.Spec.State == devboxv1alpha2.DevboxStateStopped
}

// validateAndGetCommitRecord validates devbox status and returns the current commit record
func (r *DevboxReconciler) validateAndGetCommitRecord(
	devbox *devboxv1alpha2.Devbox,
) (*devboxv1alpha2.CommitRecord, error) {
	contentID := devbox.Status.ContentID
	if contentID == "" {
		return nil, fmt.Errorf("contentID is empty for devbox %s", devbox.Name)
	}

	if devbox.Status.CommitRecords == nil {
		return nil, fmt.Errorf("commit records is nil for devbox %s", devbox.Name)
	}

	commitRecord, exists := devbox.Status.CommitRecords[contentID]
	if !exists || commitRecord == nil {
		return nil, fmt.Errorf(
			"commit record not found for contentID %s in devbox %s",
			contentID,
			devbox.Name,
		)
	}

	if commitRecord.BaseImage == "" {
		return nil, fmt.Errorf("baseImage is empty in commit record for devbox %s", devbox.Name)
	}

	return commitRecord, nil
}

// shouldHandleStorageCleanup determines if the current node should handle storage cleanup
func (r *DevboxReconciler) shouldHandleStorageCleanup(
	commitRecord *devboxv1alpha2.CommitRecord,
) bool {
	return commitRecord.Node == r.NodeName
}

// requestStorageCleanup sends a storage cleanup request via event recorder
func (r *DevboxReconciler) requestStorageCleanup(
	ctx context.Context,
	devbox *devboxv1alpha2.Devbox,
	commitRecord *devboxv1alpha2.CommitRecord,
) error {
	logger := log.FromContext(ctx)

	logger.Info("requesting devbox storage cleanup",
		"devbox", devbox.Name,
		"contentID", devbox.Status.ContentID,
		"baseImage", commitRecord.BaseImage)

	r.StateChangeRecorder.AnnotatedEventf(
		devbox,
		events.BuildStorageCleanupAnnotations(
			devbox.Name,
			devbox.Status.ContentID,
			commitRecord.BaseImage,
		),
		corev1.EventTypeNormal,
		events.ReasonStorageCleanupRequested,
		"devbox storage cleanup requested",
	)

	return nil
}

func (r *DevboxReconciler) generateImageName(devbox *devboxv1alpha2.Devbox) string {
	now := time.Now()
	return fmt.Sprintf(
		"%s/%s/%s:%s-%s",
		r.CommitImageRegistry,
		devbox.Namespace,
		devbox.Name,
		rand.String(5),
		now.Format("2006-01-02-150405"),
	)
}

func (r *DevboxReconciler) handleSubResourceDelete(
	ctx context.Context,
	devbox *devboxv1alpha2.Devbox,
	recLabels map[string]string,
) error {
	logger := log.FromContext(ctx)

	// Delete Pod
	podList := &corev1.PodList{}
	if err := r.List(
		ctx,
		podList,
		client.InNamespace(devbox.Namespace),
		client.MatchingLabels(recLabels),
	); err != nil {
		return err
	}
	for i := range podList.Items {
		pod := &podList.Items[i]
		originalPodUID := pod.UID

		// Remove finalizer with retry and UID check
		err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
			latestPod := &corev1.Pod{}
			if err := r.Get(ctx, client.ObjectKeyFromObject(pod), latestPod); err != nil {
				if apierrors.IsNotFound(err) {
					// Pod already deleted
					logger.Info("pod already deleted, skip finalizer removal", "pod", pod.Name)
					return nil
				}
				return err
			}

			// Check if UID matches
			if latestPod.UID != originalPodUID {
				logger.Info("pod UID changed, skip finalizer removal",
					"pod", pod.Name,
					"originalUID", originalPodUID,
					"currentUID", latestPod.UID)
				return nil
			}

			if controllerutil.RemoveFinalizer(latestPod, devboxv1alpha2.FinalizerName) {
				return r.Update(ctx, latestPod)
			}
			return nil
		})
		if err != nil {
			logger.Error(err, "failed to remove finalizer from pod", "pod", pod.Name)
			return err
		}
	}
	if err := r.deleteResourcesByLabels(
		ctx,
		&corev1.Pod{},
		devbox.Namespace,
		recLabels,
	); err != nil {
		return err
	}
	// Delete Service
	if err := r.deleteResourcesByLabels(
		ctx,
		&corev1.Service{},
		devbox.Namespace,
		recLabels,
	); err != nil {
		return err
	}
	// Delete Configmap
	if err := r.deleteResourcesByLabels(
		ctx,
		&corev1.ConfigMap{},
		devbox.Namespace,
		recLabels,
	); err != nil {
		return err
	}
	// Delete Secret
	return r.deleteResourcesByLabels(ctx, &corev1.Secret{}, devbox.Namespace, recLabels)
}

func (r *DevboxReconciler) deleteResourcesByLabels(
	ctx context.Context,
	obj client.Object,
	namespace string,
	labels map[string]string,
) error {
	err := r.DeleteAllOf(ctx, obj,
		client.InNamespace(namespace),
		client.MatchingLabels(labels),
	)
	return client.IgnoreNotFound(err)
}

func (r *DevboxReconciler) setConditionWithRetry(
	ctx context.Context,
	devbox *devboxv1alpha2.Devbox,
	cond metav1.Condition,
) error {
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		latest := &devboxv1alpha2.Devbox{}
		if err := r.Get(ctx, client.ObjectKeyFromObject(devbox), latest); err != nil {
			return err
		}
		cond.ObservedGeneration = latest.Generation
		cond.LastTransitionTime = metav1.Now()
		latest.SetCondition(cond)
		return r.Status().Update(ctx, latest)
	})
}

func (r *DevboxReconciler) setSyncCondition(
	ctx context.Context,
	devbox *devboxv1alpha2.Devbox,
	conditionType string,
	ok bool,
	message string,
) {
	logger := log.FromContext(ctx)
	status := metav1.ConditionFalse
	reason := devboxv1alpha2.DevboxReasonSyncFailed
	if ok {
		status = metav1.ConditionTrue
		reason = devboxv1alpha2.DevboxReasonSyncSucceeded
	}
	if err := r.setConditionWithRetry(ctx, devbox, metav1.Condition{
		Type:    conditionType,
		Status:  status,
		Reason:  reason,
		Message: message,
	}); err != nil {
		logger.Info("failed to update condition (best-effort)", "conditionType", conditionType, "error", err)
	}
}

// ContentIDChangedPredicate triggers reconcile when devbox status.contentID changes
type ContentIDChangedPredicate struct {
	predicate.Funcs
}

func (p ContentIDChangedPredicate) Update(e event.UpdateEvent) bool {
	if e.ObjectOld == nil || e.ObjectNew == nil {
		return false
	}

	oldDevbox, oldOk := e.ObjectOld.(*devboxv1alpha2.Devbox)
	newDevbox, newOk := e.ObjectNew.(*devboxv1alpha2.Devbox)
	if oldOk && newOk {
		return oldDevbox.Status.ContentID != newDevbox.Status.ContentID
	}

	return false
}

// LastContainerStatusChangedPredicate triggers reconcile when devbox status.lastContainerStatus changes
type LastContainerStatusChangedPredicate struct {
	predicate.Funcs
}

func (p LastContainerStatusChangedPredicate) Update(e event.UpdateEvent) bool {
	if e.ObjectOld == nil || e.ObjectNew == nil {
		return false
	}
	oldDevbox, oldOk := e.ObjectOld.(*devboxv1alpha2.Devbox)
	newDevbox, newOk := e.ObjectNew.(*devboxv1alpha2.Devbox)
	if oldOk && newOk {
		return oldDevbox.Status.LastContainerStatus.ContainerID != newDevbox.Status.LastContainerStatus.ContainerID
	}
	return false
}

// NetworkTypeChangedPredicate triggers reconcile when devbox status.network.type changes
type NetworkTypeChangedPredicate struct {
	predicate.Funcs
}

func (p NetworkTypeChangedPredicate) Update(e event.UpdateEvent) bool {
	if e.ObjectOld == nil || e.ObjectNew == nil {
		return false
	}
	oldDevbox, oldOk := e.ObjectOld.(*devboxv1alpha2.Devbox)
	newDevbox, newOk := e.ObjectNew.(*devboxv1alpha2.Devbox)
	if oldOk && newOk {
		return oldDevbox.Status.Network.Type != newDevbox.Status.Network.Type
	}
	return false
}

// PhaseChangedPredicate triggers reconcile when devbox status.phase changes or status.phase is `Error`
type PhaseChangedPredicate struct {
	predicate.Funcs
}

func (p PhaseChangedPredicate) Update(e event.UpdateEvent) bool {
	if e.ObjectOld == nil || e.ObjectNew == nil {
		return false
	}
	oldDevbox, oldOk := e.ObjectOld.(*devboxv1alpha2.Devbox)
	newDevbox, newOk := e.ObjectNew.(*devboxv1alpha2.Devbox)
	if oldOk && newOk {
		return oldDevbox.Status.Phase != newDevbox.Status.Phase ||
			newDevbox.Status.Phase == devboxv1alpha2.DevboxPhaseError
	}
	return false
}

// SetupWithManager sets up the controller with the Manager.
func (r *DevboxReconciler) SetupWithManager(mgr ctrl.Manager) error {
	if err := mgr.GetFieldIndexer().
		IndexField(context.Background(), &corev1.Pod{}, devboxv1alpha2.PodNodeNameIndex, func(rawObj client.Object) []string {
			pod, _ := rawObj.(*corev1.Pod)
			if pod.Spec.NodeName == "" {
				return nil
			}
			return []string{pod.Spec.NodeName}
		}); err != nil {
		return fmt.Errorf("failed to index field %s: %w", devboxv1alpha2.PodNodeNameIndex, err)
	}
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 10}).
		For(&devboxv1alpha2.Devbox{}, builder.WithPredicates(predicate.Or(
			predicate.GenerationChangedPredicate{}, // enqueue request if devbox spec is updated
			NetworkTypeChangedPredicate{},          // enqueue request if devbox status.network.type is updated
			ContentIDChangedPredicate{},            // enqueue request if devbox status.contentID is updated
			LastContainerStatusChangedPredicate{},  // enqueue request if devbox status.lastContainerStatus is updated
			PhaseChangedPredicate{},                // enqueue request if devbox status.phase is updated or status.phase is `Error`
		))).
		Owns(&corev1.Pod{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		// enqueue request if pod spec/status is updated
		Owns(&corev1.Service{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		// enqueue request if service spec is updated
		Owns(&corev1.Secret{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}
