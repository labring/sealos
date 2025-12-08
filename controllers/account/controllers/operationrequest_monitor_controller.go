package controllers

import (
	"context"
	"fmt"

	"github.com/go-logr/logr"
	"github.com/labring/sealos/controllers/pkg/types"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/labring/sealos/controllers/user/controllers/helper/config"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

const (
	userNamespacePrefix = "ns-"
)

// OperationRequestMonitorReconciler monitors OperationRequest objects for owner transfers
type OperationRequestMonitorReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	Logger logr.Logger
}

// SetupWithManager sets up the controller with the Manager.
func (r *OperationRequestMonitorReconciler) SetupWithManager(mgr ctrl.Manager) error {
	if r.Client == nil {
		r.Client = mgr.GetClient()
	}
	r.Logger = ctrl.Log.WithName("operationrequest_monitor_controller")

	return ctrl.NewControllerManagedBy(mgr).
		For(&userv1.Operationrequest{}, builder.WithPredicates(
			predicate.And(
				namespaceOnlyPredicate(config.GetUserSystemNamespace()),
				operationRequestCompletedPredicate{},
			),
		)).
		WithOptions(controller.Options{
			MaxConcurrentReconciles: 10,
		}).
		Complete(r)
}

// operationRequestCompletedPredicate filters for completed OperationRequests
type operationRequestCompletedPredicate struct {
	predicate.Funcs
}

func (operationRequestCompletedPredicate) Create(event.CreateEvent) bool {
	return false // We don't need to handle create events
}

func (operationRequestCompletedPredicate) Update(e event.UpdateEvent) bool {
	oldObj, okOld := e.ObjectOld.(*userv1.Operationrequest)
	newObj, okNew := e.ObjectNew.(*userv1.Operationrequest)
	if !okOld || !okNew {
		return false
	}

	// Only process when status changes to Completed
	return oldObj.Status.Phase != userv1.RequestCompleted &&
		newObj.Status.Phase == userv1.RequestCompleted
}

func (operationRequestCompletedPredicate) Delete(event.DeleteEvent) bool {
	return false
}

func (operationRequestCompletedPredicate) Generic(event.GenericEvent) bool {
	return false
}

// +kubebuilder:rbac:groups=user.sealos.io,resources=operationrequests,verbs=get;list;watch

func (r *OperationRequestMonitorReconciler) Reconcile(
	ctx context.Context,
	req ctrl.Request,
) (ctrl.Result, error) {
	operationRequest := &userv1.Operationrequest{}
	if err := r.Get(ctx, req.NamespacedName, operationRequest); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	// Only process completed requests
	if operationRequest.Status.Phase != userv1.RequestCompleted {
		return ctrl.Result{}, nil
	}

	// Check if this is an owner transfer request
	if operationRequest.Spec.Role != userv1.OwnerRoleType {
		r.Logger.V(1).Info("Skipping non-owner role operation request",
			"request.name", operationRequest.Name,
			"request.namespace", operationRequest.Namespace,
			"request.role", operationRequest.Spec.Role,
			"request.user", operationRequest.Spec.User,
		)
		return ctrl.Result{}, nil
	}

	// Only process Grant and Update actions for owner role
	if operationRequest.Spec.Action != userv1.Grant &&
		operationRequest.Spec.Action != userv1.Update {
		r.Logger.V(1).Info("Skipping non-grant/update action for owner role",
			"request.name", operationRequest.Name,
			"request.namespace", operationRequest.Namespace,
			"request.action", operationRequest.Spec.Action,
			"request.user", operationRequest.Spec.User,
		)
		return ctrl.Result{}, nil
	}

	// Handle namespace status synchronization based on owner's namespace status
	if err := r.syncNamespaceStatus(ctx, operationRequest.Spec.User, operationRequest.Spec.Namespace); err != nil {
		r.Logger.Error(err, "Failed to sync namespace status",
			"newOwner", operationRequest.Spec.User,
			"targetNamespace", operationRequest.Spec.Namespace,
		)
		return ctrl.Result{}, err
	}

	return ctrl.Result{}, nil
}

func namespaceOnlyPredicate(namespace string) predicate.Predicate {
	return predicate.Funcs{
		CreateFunc: func(e event.CreateEvent) bool {
			return e.Object.GetNamespace() == namespace
		},
		DeleteFunc: func(e event.DeleteEvent) bool {
			return e.Object.GetNamespace() == namespace
		},
		UpdateFunc: func(e event.UpdateEvent) bool {
			return e.ObjectNew.GetNamespace() == namespace
		},
		GenericFunc: func(e event.GenericEvent) bool {
			return e.Object.GetNamespace() == namespace
		},
	}
}

// syncNamespaceStatus synchronizes the target namespace status based on owner's namespace status
// 1. Gets the owner's namespace (ns-owner)
// 2. Checks owner's namespace status
// 3. Synchronizes the target namespace status accordingly
func (r *OperationRequestMonitorReconciler) syncNamespaceStatus(
	ctx context.Context,
	owner, targetNamespace string,
) error {
	// Get the owner's namespace
	ownerNamespace, err := r.getOwnerNamespace(ctx, owner)
	if err != nil {
		return fmt.Errorf("failed to get owner namespace for %s: %w", owner, err)
	}

	// Get the target namespace
	targetNs := &corev1.Namespace{}
	if err := r.Get(ctx, client.ObjectKey{Name: targetNamespace}, targetNs); err != nil {
		return fmt.Errorf("failed to get target namespace %s: %w", targetNamespace, err)
	}

	// Synchronize target namespace status based on owner's namespace status
	return r.synchronizeNamespaceStatus(ctx, ownerNamespace, targetNs)
}

// getOwnerNamespace finds the owner's namespace by owner label
func (r *OperationRequestMonitorReconciler) getOwnerNamespace(
	ctx context.Context,
	owner string,
) (*corev1.Namespace, error) {
	// Get the owner's namespace using the naming convention
	namespace := &corev1.Namespace{}
	err := r.Get(ctx, client.ObjectKey{Name: userNamespacePrefix + owner}, namespace)
	if err != nil {
		return nil, fmt.Errorf(
			"failed to get owner namespace %s%s: %w",
			userNamespacePrefix,
			owner,
			err,
		)
	}
	return namespace, nil
}

// synchronizeNamespaceStatus synchronizes target namespace annotations based on owner namespace status
// If owner debt status is empty/normal/resume/resume-completed and target is suspended, it will resume the target namespace
func (r *OperationRequestMonitorReconciler) synchronizeNamespaceStatus(
	ctx context.Context,
	ownerNamespace, targetNamespace *corev1.Namespace,
) error {
	if targetNamespace.Annotations == nil {
		targetNamespace.Annotations = make(map[string]string)
	}

	// Get owner debt status only
	var ownerDebtStatus string
	if ownerNamespace.Annotations != nil {
		ownerDebtStatus = ownerNamespace.Annotations[types.DebtNamespaceAnnoStatusKey]
	}

	targetDebtStatus := targetNamespace.Annotations[types.DebtNamespaceAnnoStatusKey]

	// Check if owner debt status allows resuming and target is in suspended state
	if isOwnerEligibleForResume(ownerDebtStatus) && isSuspendedDebtStatus(targetDebtStatus) {
		// Resume the target namespace
		targetNamespace.Annotations[types.DebtNamespaceAnnoStatusKey] = types.ResumeDebtNamespaceAnnoStatus

		// Update the target namespace
		if err := r.Update(ctx, targetNamespace); err != nil {
			return fmt.Errorf(
				"failed to update target namespace %s annotations: %w",
				targetNamespace.Name,
				err,
			)
		}

		r.Logger.Info("Successfully resumed target namespace",
			"targetNamespace", targetNamespace.Name,
			"ownerNamespace", ownerNamespace.Name,
		)
	}

	return nil
}

// isOwnerEligibleForResume checks if owner debt status allows resuming target namespaces
func isOwnerEligibleForResume(ownerStatus string) bool {
	// Owner is eligible if status is empty, normal, resume, or resume-completed
	return ownerStatus == "" ||
		ownerStatus == types.NormalDebtNamespaceAnnoStatus ||
		ownerStatus == types.ResumeDebtNamespaceAnnoStatus ||
		ownerStatus == types.ResumeCompletedDebtNamespaceAnnoStatus
}

// isSuspendedDebtStatus checks if the debt status indicates a suspended state
func isSuspendedDebtStatus(status string) bool {
	return status == types.SuspendDebtNamespaceAnnoStatus ||
		status == types.SuspendCompletedDebtNamespaceAnnoStatus ||
		status == types.TerminateSuspendDebtNamespaceAnnoStatus ||
		status == types.TerminateSuspendCompletedDebtNamespaceAnnoStatus ||
		status == types.FinalDeletionDebtNamespaceAnnoStatus ||
		status == types.FinalDeletionCompletedDebtNamespaceAnnoStatus
}
