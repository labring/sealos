package controller

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	devboxv1alpha1 "github.com/labring/sealos/controllers/devbox/api/v1alpha1"
	"github.com/labring/sealos/controllers/devbox/internal/controller/utils/nodes"
	"github.com/labring/sealos/controllers/devbox/label"

	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/rand"
	"k8s.io/client-go/tools/record"
)

// DevboxDaemonReconciler reconciles devbox pods for monitoring purposes
type DevboxDaemonReconciler struct {
	CommitImageRegistry string
	client.Client
	Scheme   *runtime.Scheme
	Recorder record.EventRecorder
}

// +kubebuilder:rbac:groups="",resources=pods,verbs=get;list;watch
// +kubebuilder:rbac:groups="",resources=events,verbs=create;patch

func (r *DevboxDaemonReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := log.FromContext(ctx)

	// Get the pod that triggered this reconciliation
	pod := &corev1.Pod{}
	if err := r.Get(ctx, req.NamespacedName, pod); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	// Check if this is a devbox pod by looking for the devbox label, and the devbox is scheduled to the current node
	if !r.isDevboxPod(pod) || r.getDevboxNameFromPod(pod) == "" || pod.Spec.NodeName != nodes.GetNodeName() {
		return ctrl.Result{}, nil
	}

	devboxName := r.getDevboxNameFromPod(pod)
	devbox := &devboxv1alpha1.Devbox{}
	if err := r.Get(ctx, types.NamespacedName{Namespace: pod.Namespace, Name: devboxName}, devbox); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	logger.Info("Processing devbox pod event",
		"podName", pod.Name,
		"namespace", pod.Namespace,
		"devboxName", devboxName,
		"podNode", pod.Spec.NodeName)

	if devbox.Status.CommitRecords[devbox.Status.ContentID] == nil {
		logger.Error(errors.New("current record is nil"), "current record is nil", "devboxName", devboxName)
		return ctrl.Result{}, errors.New("current record is nil")
	}
	if pod.DeletionTimestamp != nil {
		defer func() {
			controllerutil.RemoveFinalizer(pod, devboxv1alpha1.FinalizerName)
			if err := r.Update(ctx, pod); err != nil {
				logger.Error(err, "remove finalizer failed")
			}
		}()
		logger.Info("Devbox pod is deleted", "podName", pod.Name, "namespace", pod.Namespace)
		switch devbox.Spec.State {
		case devboxv1alpha1.DevboxStateRunning, devboxv1alpha1.DevboxStateStopped:
			logger.Info("Devbox is running or stopped, try to update devbox status", "devboxName", devboxName)
			devbox.Status.CommitRecords[devbox.Status.ContentID].UpdateTime = metav1.Now()
			devbox.Status.CommitRecords[devbox.Status.ContentID].Node = pod.Spec.NodeName
			if err := r.Status().Update(ctx, devbox); err != nil {
				return ctrl.Result{}, err
			}
		case devboxv1alpha1.DevboxStateShutdown:
			logger.Info(
				"Devbox is shutdown, pod is deleted, commit devbox and create a new content id and new record",
				"devboxName", devboxName)
			devbox.Status.CommitRecords[devbox.Status.ContentID].CommitStatus = devboxv1alpha1.CommitStatusSuccess
			devbox.Status.CommitRecords[devbox.Status.ContentID].CommitTime = metav1.Now()
			devbox.Status.CommitRecords[devbox.Status.ContentID].Node = pod.Spec.NodeName
			// todo: implement this: call commit controller to commit the devbox
			// containerd.Commit(ctx, devboxName, currentRecord.CommitID)
			// after commit, we need to update the devbox status node to empty, create a new content id and new record
			devbox.Status.ContentID = uuid.New().String()
			devbox.Status.CommitRecords[devbox.Status.ContentID] = &devboxv1alpha1.CommitRecord{
				CommitStatus: devboxv1alpha1.CommitStatusPending,
				Node:         "",
				Image:        r.generateImageName(devbox),
				GenerateTime: metav1.Now(),
			}
			if err := r.Status().Update(ctx, devbox); err != nil {
				return ctrl.Result{}, err
			}
		}
	}
	return ctrl.Result{}, nil
}

func (r *DevboxDaemonReconciler) generateImageName(devbox *devboxv1alpha1.Devbox) string {
	now := time.Now()
	return fmt.Sprintf("%s/%s/%s:%s-%s", r.CommitImageRegistry, devbox.Namespace, devbox.Name, rand.String(5), now.Format("2006-01-02-150405"))
}

// isDevboxPod checks if a pod is a devbox pod by looking for the devbox label
func (r *DevboxDaemonReconciler) isDevboxPod(pod *corev1.Pod) bool {
	if pod.Labels == nil {
		return false
	}
	// Check for the devbox part-of label
	if partOf, exists := pod.Labels[label.AppPartOf]; exists && partOf == devboxv1alpha1.LabelDevBoxPartOf {
		return true
	}
	// Check for the managed-by label
	if managedBy, exists := pod.Labels[label.AppManagedBy]; exists && managedBy == label.DefaultManagedBy {
		return true
	}
	return false
}

func (r *DevboxDaemonReconciler) getDevboxNameFromPod(pod *corev1.Pod) string {
	if pod.Labels == nil {
		return ""
	}
	return pod.Labels[label.AppName]
}

// DevboxPodPredicate filters events to only process devbox pods
type DevboxPodPredicate struct {
	predicate.Funcs
}

func (p *DevboxPodPredicate) Create(e event.CreateEvent) bool {
	if pod, ok := e.Object.(*corev1.Pod); ok {
		// Check if this is a devbox pod
		if pod.Labels != nil {
			if partOf, exists := pod.Labels[label.AppPartOf]; exists && partOf == devboxv1alpha1.LabelDevBoxPartOf {
				return true
			}
		}
	}
	return false
}

func (p *DevboxPodPredicate) Update(e event.UpdateEvent) bool {
	if pod, ok := e.ObjectNew.(*corev1.Pod); ok {
		// Check if this is a devbox pod
		if pod.Labels != nil {
			if partOf, exists := pod.Labels[label.AppPartOf]; exists && partOf == devboxv1alpha1.LabelDevBoxPartOf {
				return true
			}
		}
	}
	return false
}

func (p *DevboxPodPredicate) Delete(e event.DeleteEvent) bool {
	if pod, ok := e.Object.(*corev1.Pod); ok {
		// Check if this is a devbox pod
		if pod.Labels != nil {
			if partOf, exists := pod.Labels[label.AppPartOf]; exists && partOf == devboxv1alpha1.LabelDevBoxPartOf {
				return true
			}
		}
	}
	return false
}

func (p *DevboxPodPredicate) Generic(e event.GenericEvent) bool {
	if pod, ok := e.Object.(*corev1.Pod); ok {
		// Check if this is a devbox pod
		if pod.Labels != nil {
			if partOf, exists := pod.Labels[label.AppPartOf]; exists && partOf == devboxv1alpha1.LabelDevBoxPartOf {
				return true
			}
		}
	}
	return false
}

func (r *DevboxDaemonReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&corev1.Pod{}).
		Complete(r)
}
