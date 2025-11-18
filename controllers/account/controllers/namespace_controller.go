package controllers

import (
	"context"
	"encoding/json"
	errors2 "errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go-logr/logr"
	v1 "github.com/labring/sealos/controllers/account/api/v1"
	devboxv1alpha1 "github.com/labring/sealos/controllers/devbox/api/v1alpha1"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/minio/madmin-go/v3"
	// kbv1alpha1 "github.com/apecloud/kubeblocks/apis/apps/v1alpha1"
	objectstoragev1 "github/labring/sealos/controllers/objectstorage/api/v1"
	appsv1 "k8s.io/api/apps/v1"
	autoscalingv2 "k8s.io/api/autoscaling/v2"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	v12 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/apimachinery/pkg/watch"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
	"k8s.io/utils/ptr"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

// NamespaceReconciler reconciles a Namespace object
type NamespaceReconciler struct {
	Client                client.WithWatch
	dynamicClient         dynamic.Interface
	Log                   logr.Logger
	Scheme                *runtime.Scheme
	OSAdminClient         *madmin.AdminClient
	OSNamespace           string
	OSAdminSecret         string
	InternalEndpoint      string
	deleteBackupSemaphore chan struct{}
}

const (
	DebtLimit0Name        = "debt-limit0"
	OSAccessKey           = "CONSOLE_ACCESS_KEY"
	OSSecretKey           = "CONSOLE_SECRET_KEY"
	Disabled              = "disabled"
	Enabled               = "enabled"
	OSInternalEndpointEnv = "OSInternalEndpoint"
	OSNamespace           = "OSNamespace"
	OSAdminSecret         = "OSAdminSecret"

	// App deploy annotations
	PauseKey           = "deploy.cloud.sealos.io/pause"
	MinReplicasKey     = "deploy.cloud.sealos.io/minReplicas"
	MaxReplicasKey     = "deploy.cloud.sealos.io/maxReplicas"
	DeployPVCResizeKey = "deploy.cloud.sealos.io/resize"
)

//+kubebuilder:rbac:groups=core,resources=namespaces,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=namespaces/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=core,resources=namespaces/finalizers,verbs=update
//+kubebuilder:rbac:groups=batch,resources=cronjobs,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=batch,resources=jobs,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups="",resources=secrets,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=apps.kubeblocks.io,resources=clusters,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=apps.kubeblocks.io,resources=clusters/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=apps.kubeblocks.io,resources=opsrequests,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=apps.kubeblocks.io,resources=opsrequests/status,verbs=get;update;watch
//+kubebuilder:rbac:groups=app.sealos.io,resources=apps,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=app.sealos.io,resources=instances,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=autoscaling,resources=horizontalpodautoscalers,verbs=get;list;watch;create;update;patch;delete

//nolint:gocyclo
func (r *NamespaceReconciler) Reconcile(
	ctx context.Context,
	req ctrl.Request,
) (ctrl.Result, error) {
	logger := r.Log.WithValues("Namespace", req.Namespace, "Name", req.NamespacedName)

	ns := corev1.Namespace{}
	if err := r.Client.Get(ctx, req.NamespacedName, &ns); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	if ns.Status.Phase == corev1.NamespaceTerminating {
		logger.V(1).Info("namespace is terminating")
		return ctrl.Result{}, nil
	}

	if ns.Annotations == nil {
		logger.V(1).Info("No debt or network status annotations found")
		return ctrl.Result{}, nil
	}

	debtStatus, debtExists := ns.Annotations[types.DebtNamespaceAnnoStatusKey]
	networkStatus, networkExists := ns.Annotations[types.NetworkStatusAnnoKey]
	if !debtExists && !networkExists {
		logger.V(1).Info("No debt or network status annotations found")
		return ctrl.Result{}, nil
	}

	debtCompletedStates := map[string]bool{
		types.SuspendCompletedDebtNamespaceAnnoStatus:          true,
		types.FinalDeletionCompletedDebtNamespaceAnnoStatus:    true,
		types.ResumeCompletedDebtNamespaceAnnoStatus:           true,
		types.TerminateSuspendCompletedDebtNamespaceAnnoStatus: true,
	}
	networkCompletedStates := map[string]bool{
		types.NetworkSuspendCompleted: true,
		types.NetworkResumeCompleted:  true,
	}
	deleteConst := "delete"

	// auxiliary function update annotations
	updateAnnotations := func(debtStatus, networkStatus string) (ctrl.Result, error) {
		if debtStatus != "" {
			ns.Annotations[types.DebtNamespaceAnnoStatusKey] = debtStatus
		}
		if networkStatus != "" {
			ns.Annotations[types.NetworkStatusAnnoKey] = networkStatus
		}
		if err := r.Client.Update(ctx, &ns); err != nil {
			logger.Error(err, "failed to update namespace annotations")
			return ctrl.Result{}, err
		}
		return ctrl.Result{}, nil
	}

	// auxiliary function handles resource operations
	performAction := func(action func(context.Context, string) error, actionName string) (ctrl.Result, error) {
		if err := action(ctx, req.Name); err != nil {
			logger.Error(err, actionName+" namespace resources failed")
			return ctrl.Result{
				Requeue:      actionName == deleteConst,
				RequeueAfter: 10 * time.Minute,
			}, err
		}
		return ctrl.Result{}, nil
	}

	// state transition table
	type stateTransition struct {
		condition  func() bool
		newDebt    string
		newNetwork string
		action     func(context.Context, string) error
		actionName string
	}

	transitions := []stateTransition{
		// Case 1: only the debt status
		{
			condition: func() bool { return debtExists && !networkExists && !debtCompletedStates[debtStatus] },
			newDebt: func() string {
				switch debtStatus {
				case types.SuspendDebtNamespaceAnnoStatus:
					return types.SuspendCompletedDebtNamespaceAnnoStatus
				case types.TerminateSuspendDebtNamespaceAnnoStatus:
					return types.TerminateSuspendCompletedDebtNamespaceAnnoStatus
				case types.ResumeDebtNamespaceAnnoStatus:
					return types.ResumeCompletedDebtNamespaceAnnoStatus
				case types.FinalDeletionDebtNamespaceAnnoStatus:
					return types.FinalDeletionCompletedDebtNamespaceAnnoStatus
				default:
					return types.NormalDebtNamespaceAnnoStatus
				}
			}(),
			newNetwork: "",
			action: func(ctx context.Context, name string) error {
				switch debtStatus {
				case types.SuspendDebtNamespaceAnnoStatus,
					types.TerminateSuspendDebtNamespaceAnnoStatus:
					return r.SuspendUserResource(ctx, name)
				case types.ResumeDebtNamespaceAnnoStatus:
					return r.ResumeUserResource(ctx, name)
				case types.FinalDeletionDebtNamespaceAnnoStatus:
					return r.DeleteUserResource(ctx, name)
				default:
					return nil
				}
			},
			actionName: func() string {
				switch debtStatus {
				case types.FinalDeletionDebtNamespaceAnnoStatus:
					return deleteConst
				default:
					return "suspend/resume"
				}
			}(),
		},
		// Case 2: only in the network state
		{
			condition: func() bool { return !debtExists && networkExists && !networkCompletedStates[networkStatus] },
			newDebt:   "",
			newNetwork: func() string {
				switch networkStatus {
				case types.NetworkSuspend:
					return types.NetworkSuspendCompleted
				case types.NetworkResume:
					return types.NetworkResumeCompleted
				default:
					return ""
				}
			}(),
			action: func(ctx context.Context, name string) error {
				switch networkStatus {
				case types.NetworkSuspend:
					return r.SuspendUserResource(ctx, name)
				case types.NetworkResume:
					return r.ResumeUserResource(ctx, name)
				default:
					return nil
				}
			},
			actionName: "suspend/resume",
		},
		// Case 3: both the debt and network states exist
		{
			condition: func() bool {
				if debtExists && networkExists {
					if debtStatus == types.FinalDeletionDebtNamespaceAnnoStatus {
						return true
					}
				}
				return debtExists && networkExists && !debtCompletedStates[debtStatus] &&
					!networkCompletedStates[networkStatus]
			},
			newDebt: func() string {
				switch debtStatus {
				case types.NormalDebtNamespaceAnnoStatus:
					return types.NormalDebtNamespaceAnnoStatus
				case types.SuspendDebtNamespaceAnnoStatus:
					return types.SuspendCompletedDebtNamespaceAnnoStatus
				case types.TerminateSuspendDebtNamespaceAnnoStatus:
					return types.TerminateSuspendCompletedDebtNamespaceAnnoStatus
				case types.ResumeDebtNamespaceAnnoStatus:
					return types.ResumeCompletedDebtNamespaceAnnoStatus
				case types.FinalDeletionDebtNamespaceAnnoStatus:
					return types.FinalDeletionCompletedDebtNamespaceAnnoStatus
				default:
					return types.NormalDebtNamespaceAnnoStatus
				}
			}(),
			newNetwork: func() string {
				switch networkStatus {
				case types.NetworkSuspend:
					return types.NetworkSuspendCompleted
				case types.NetworkResume:
					return types.NetworkResumeCompleted
				default:
					return networkStatus
				}
			}(),
			action: func(ctx context.Context, name string) error {
				if debtStatus == types.FinalDeletionDebtNamespaceAnnoStatus {
					return r.DeleteUserResource(ctx, name)
				}
				if networkStatus == types.NetworkSuspend ||
					debtStatus == types.SuspendDebtNamespaceAnnoStatus ||
					debtStatus == types.TerminateSuspendDebtNamespaceAnnoStatus {
					return r.SuspendUserResource(ctx, name)
				}
				if networkStatus == types.NetworkResume ||
					debtStatus == types.ResumeDebtNamespaceAnnoStatus {
					return r.ResumeUserResource(ctx, name)
				}
				return nil
			},
			actionName: func() string {
				if debtStatus == types.FinalDeletionDebtNamespaceAnnoStatus {
					return deleteConst
				}
				return "suspend/resume"
			}(),
		},
		// Case 4: debt completion status handling network
		{
			condition: func() bool {
				return debtExists && networkExists && debtCompletedStates[debtStatus] &&
					!networkCompletedStates[networkStatus]
			},
			newDebt: debtStatus,
			newNetwork: func() string {
				switch networkStatus {
				case types.NetworkSuspend:
					return types.NetworkSuspendCompleted
				case types.NetworkResume:
					return types.NetworkResumeCompleted
				default:
					return networkStatus
				}
			}(),
			action: func(ctx context.Context, name string) error {
				switch networkStatus {
				case types.NetworkSuspend:
					return r.SuspendUserResource(ctx, name)
				case types.NetworkResume:
					return r.ResumeUserResource(ctx, name)
				default:
					return nil
				}
			},
			actionName: "suspend/resume",
		},
	}

	// perform state transition
	for _, t := range transitions {
		if t.condition() {
			if t.action != nil {
				if result, err := performAction(t.action, t.actionName); err != nil {
					return result, err
				}
			}
			if t.newDebt != "" || t.newNetwork != "" {
				r.Log.Info(
					"update namespace anno ",
					"old debt status",
					debtStatus,
					"new debt status",
					t.newDebt,
					"old network status",
					networkStatus,
					"network status",
					t.newNetwork,
				)
				return updateAnnotations(t.newDebt, t.newNetwork)
			}
			return ctrl.Result{}, nil
		}
	}

	// Default: The status is completed or does not require processing
	logger.Info("No action required", "debtStatus", debtStatus, "networkStatus", networkStatus)
	return ctrl.Result{}, nil
}

func (r *NamespaceReconciler) SuspendUserResource(ctx context.Context, namespace string) error {
	// IMPORTANT: The order of operations matters!
	// 1. suspendOrphanPod must run FIRST because it needs to recreate pods with the debt scheduler,
	//    which requires pod creation permissions.
	// 2. limitResourceQuotaCreate runs immediately after to quickly block all new resource creation,
	//    preventing any new workloads from being created during the suspension process.
	pipelines := []func(context.Context, string) error{
		r.suspendOrphanPod,          // Recreate orphan pods with debt scheduler (requires pod creation)
		r.limitResourceQuotaCreate,  // Create resource quota to block all new resources (must be after suspendOrphanPod)
		r.suspendKBCluster,          // Stop KubeBlocks clusters and disable backup
		r.suspendDevboxes,           // Stop devboxes and save original state
		r.suspendCertificates,       // Disable cert-manager certificate renewal
		r.suspendIngresses,          // Pause ingresses by changing ingress class to "pause"
		r.suspendOrphanDeployments,  // Scale orphan deployments to 0 replicas
		r.suspendOrphanStatefulSets, // Scale orphan statefulsets to 0 replicas
		r.suspendOrphanReplicaSets,  // Scale orphan replicasets to 0 replicas
		r.suspendOrphanCronJob,      // Suspend orphan cronjobs
		r.suspendOrphanJob,          // Suspend orphan jobs
		r.deleteControlledPod,       // Delete controlled pods
		r.suspendObjectStorage,      // Disable object storage access
	}
	var errs []error
	for _, fn := range pipelines {
		if err := fn(ctx, namespace); err != nil {
			errs = append(errs, err)
		}
	}
	return errors2.Join(errs...)
}

func (r *NamespaceReconciler) deleteBackupWithRateLimit(
	ctx context.Context,
	namespace string,
) error {
	// Acquire semaphore to limit concurrent backup deletions
	select {
	case r.deleteBackupSemaphore <- struct{}{}:
		// Successfully acquired semaphore for backup deletion
		defer func() {
			<-r.deleteBackupSemaphore // Release semaphore when done
		}()
		return deleteResource(ctx, r.dynamicClient, "backup", namespace)
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (r *NamespaceReconciler) DeleteUserResource(ctx context.Context, namespace string) error {
	// Delete backup with rate limiting
	err := r.deleteBackupWithRateLimit(ctx, namespace)
	if err != nil {
		return err
	}

	// Delete other resources without rate limiting
	deleteResources := []string{
		"cluster.apps.kubeblocks.io", "backupschedules", "devboxes", "devboxreleases", "cronjob",
		"objectstorageuser", "deploy", "sts", "pvc", "Service", "Ingress",
		"Issuer", "Certificate", "HorizontalPodAutoscaler", "instance",
		"job", "app",
	}
	errChan := make(chan error, len(deleteResources))
	for _, rs := range deleteResources {
		go func(resource string) {
			errChan <- deleteResource(ctx, r.dynamicClient, resource, namespace)
		}(rs)
	}
	for range deleteResources {
		if err := <-errChan; err != nil {
			return err
		}
	}
	return nil
}

func (r *NamespaceReconciler) ResumeUserResource(ctx context.Context, namespace string) error {
	pipelines := []func(context.Context, string) error{
		r.limitResourceQuotaDelete, // Remove resource quota
		r.resumeOrphanPod,          // Resume orphan pods
		r.resumeKBCluster,          // Start KubeBlocks clusters and restore backup
		r.resumeDevboxes,           // Restore devboxes to original state
		r.resumeOrphanReplicaSets,  // Restore orphan replicaset replicas
		r.resumeOrphanDeployments,  // Restore orphan deployment replicas
		r.resumeOrphanStatefulSets, // Restore orphan statefulset replicas
		r.resumeOrphanCronJob,      // Restore orphan cronjob suspend state
		r.resumeOrphanJob,          // Restore orphan job suspend state
		r.resumeCertificates,       // Restore certificate renewal
		r.resumeIngresses,          // Restore ingresses by changing ingress class back
		r.resumeObjectStorage,      // Enable object storage access
	}
	var errs []error
	for _, fn := range pipelines {
		if err := fn(ctx, namespace); err != nil {
			errs = append(errs, err)
		}
	}
	return errors2.Join(errs...)
}

func (r *NamespaceReconciler) limitResourceQuotaCreate(
	ctx context.Context,
	namespace string,
) error {
	limitQuota := GetLimit0ResourceQuota(namespace)
	_, err := ctrl.CreateOrUpdate(ctx, r.Client, limitQuota, func() error {
		return nil
	})
	return err
}

func (r *NamespaceReconciler) limitResourceQuotaDelete(
	ctx context.Context,
	namespace string,
) error {
	limitQuota := GetLimit0ResourceQuota(namespace)
	err := r.Client.Delete(ctx, limitQuota)
	return client.IgnoreNotFound(err)
}

func GetLimit0ResourceQuota(namespace string) *corev1.ResourceQuota {
	quota := corev1.ResourceQuota{}
	quota.Name = "debt-limit0"
	quota.Namespace = namespace
	quota.Spec.Hard = corev1.ResourceList{
		corev1.ResourceLimitsCPU:       resource.MustParse("0"),
		corev1.ResourceLimitsMemory:    resource.MustParse("0"),
		corev1.ResourceRequestsStorage: resource.MustParse("0"),
	}
	return &quota
}

func (r *NamespaceReconciler) suspendKBCluster(ctx context.Context, namespace string) error {
	logger := r.Log.WithValues("Namespace", namespace, "Function", "suspendKBCluster")

	// Define the GroupVersionResource for KubeBlocks clusters
	clusterGVR := schema.GroupVersionResource{
		Group:    "apps.kubeblocks.io",
		Version:  "v1alpha1",
		Resource: "clusters",
	}

	// List all clusters in the namespace
	clusterList, err := r.dynamicClient.Resource(clusterGVR).
		Namespace(namespace).
		List(ctx, v12.ListOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			return nil
		}
		return fmt.Errorf("failed to list clusters in namespace %s: %w", namespace, err)
	}

	// Define the GroupVersionResource for OpsRequests
	opsGVR := schema.GroupVersionResource{
		Group:    "apps.kubeblocks.io",
		Version:  "v1alpha1",
		Resource: "opsrequests",
	}

	// Iterate through each cluster
	for _, cluster := range clusterList.Items {
		clusterName := cluster.GetName()
		logger.V(1).Info("Processing cluster", "Cluster", clusterName)

		annotations := cluster.GetAnnotations()
		if annotations == nil {
			annotations = make(map[string]string)
		}

		// Check if already has original state saved
		_, hasOriginalState := annotations[OriginalSuspendStateAnnotation]

		// Check if cluster is already stopped
		isAlreadyStopped := false
		status, exists := cluster.Object["status"]
		if exists && status != nil {
			phase, _ := status.(map[string]any)["phase"].(string)
			if phase == "Stopped" || phase == "Stopping" {
				isAlreadyStopped = true
				logger.V(1).
					Info("Cluster already stopped or stopping", "Cluster", clusterName)
			}
		}

		// Get current backup configuration (only once, used for both saving state and disabling backup)
		backupEnabled := false
		backup, hasBackup, err := unstructured.NestedMap(cluster.Object, "spec", "backup")
		if err != nil {
			logger.Error(err, "failed to get backup config", "cluster", clusterName)
		} else if hasBackup && backup != nil {
			enabled, found, _ := unstructured.NestedBool(cluster.Object, "spec", "backup", "enabled")
			if found {
				backupEnabled = enabled
			}
			// If enabled field doesn't exist, default is false (backup disabled)
		}

		// Track if cluster needs update
		needsUpdate := false

		// Save original state only if not already saved
		if !hasOriginalState {
			// Determine if cluster was running (not Stopped or Stopping)
			wasRunning := !isAlreadyStopped

			originalState := &KBClusterOriginalState{
				WasRunning:    wasRunning,
				BackupEnabled: backupEnabled,
			}
			stateJSON, err := encodeKBClusterState(originalState)
			if err != nil {
				logger.Error(err, "failed to encode cluster state", "cluster", clusterName)
				return fmt.Errorf("failed to encode cluster state for %s: %w", clusterName, err)
			}
			annotations[OriginalSuspendStateAnnotation] = stateJSON
			needsUpdate = true

			logger.Info(
				"Saved cluster state",
				"cluster",
				clusterName,
				"wasRunning",
				wasRunning,
				"backupEnabled",
				backupEnabled,
			)
		} else {
			logger.V(1).Info("Cluster already has original state, skipping state save", "Cluster", clusterName)
		}

		// Disable backup if it exists and is enabled
		if hasBackup && backup != nil && backupEnabled {
			if err := unstructured.SetNestedField(cluster.Object, false, "spec", "backup", "enabled"); err != nil {
				logger.Error(err, "failed to set backup.enabled=false", "cluster", clusterName)
			} else {
				logger.Info("Disabled backup for cluster", "cluster", clusterName)
				needsUpdate = true
			}
		}

		// Update cluster only if there are actual changes
		if needsUpdate {
			cluster.SetAnnotations(annotations)
			_, err = r.dynamicClient.Resource(clusterGVR).
				Namespace(namespace).
				Update(ctx, &cluster, v12.UpdateOptions{})
			if err != nil {
				logger.Error(err, "failed to update cluster", "cluster", clusterName)
				return fmt.Errorf("failed to update cluster %s: %w", clusterName, err)
			}
		} else {
			logger.V(1).Info("No changes needed for cluster, skipping update", "Cluster", clusterName)
		}

		// Skip OpsRequest creation if cluster is already stopped or stopping
		if isAlreadyStopped {
			logger.V(1).
				Info("Skipping OpsRequest creation for already stopped cluster", "Cluster", clusterName)
			continue
		}

		// Create OpsRequest resource to stop the cluster
		opsName := fmt.Sprintf("stop-%s-%s", clusterName, time.Now().Format("2006-01-02-15"))
		opsRequest := &unstructured.Unstructured{}
		opsRequest.SetGroupVersionKind(schema.GroupVersionKind{
			Group:   "apps.kubeblocks.io",
			Version: "v1alpha1",
			Kind:    "OpsRequest",
		})
		opsRequest.SetNamespace(namespace)
		opsRequest.SetName(opsName)

		// Set OpsRequest spec
		opsSpec := map[string]any{
			"clusterRef":             clusterName,
			"type":                   "Stop",
			"ttlSecondsAfterSucceed": int64(1),
			"ttlSecondsBeforeAbort":  int64(60 * 60),
		}
		if err := unstructured.SetNestedField(opsRequest.Object, opsSpec, "spec"); err != nil {
			return fmt.Errorf(
				"failed to set spec for OpsRequest %s in namespace %s: %w",
				opsName,
				namespace,
				err,
			)
		}

		_, err = r.dynamicClient.Resource(opsGVR).
			Namespace(namespace).
			Create(ctx, opsRequest, v12.CreateOptions{})
		if err != nil && !errors.IsAlreadyExists(err) {
			return fmt.Errorf(
				"failed to create OpsRequest %s in namespace %s: %w",
				opsName,
				namespace,
				err,
			)
		}
		if errors.IsAlreadyExists(err) {
			logger.V(1).Info("OpsRequest already exists, skipping creation", "OpsRequest", opsName)
		}
	}
	return nil
}

// func (r *NamespaceReconciler) suspendKBCluster(ctx context.Context, namespace string) error {
//	kbClusterList := kbv1alpha1.ClusterList{}
//	if err := r.Client.List(ctx, &kbClusterList, client.InNamespace(namespace)); err != nil {
//		return err
//	}
//	for _, kbCluster := range kbClusterList.Items {
//		if kbCluster.Status.Phase == kbv1alpha1.StoppedClusterPhase || kbCluster.Status.Phase == kbv1alpha1.StoppingClusterPhase {
//			continue
//		}
//		ops := kbv1alpha1.OpsRequest{}
//		ops.Namespace = kbCluster.Namespace
//		ops.ObjectMeta.Name = "stop-" + kbCluster.Name + "-" + time.Now().Format("2006-01-02-15")
//		ops.Spec.TTLSecondsAfterSucceed = 1
//		abort := int32(60 * 60)
//		ops.Spec.TTLSecondsBeforeAbort = &abort
//		ops.Spec.ClusterRef = kbCluster.Name
//		ops.Spec.Type = "Stop"
//		_, err := controllerutil.CreateOrUpdate(ctx, r.Client, &ops, func() error {
//			return nil
//		})
//		if err != nil {
//			r.Log.Error(err, "create ops request failed", "ops", ops.Name, "namespace", ops.Namespace)
//		}
//	}
//	return nil
//}

// hasController checks if a resource has a controller owner reference
func hasController(ownerRefs []v12.OwnerReference) bool {
	for _, ref := range ownerRefs {
		if ref.Controller != nil && *ref.Controller {
			return true
		}
	}
	return false
}

// deployViaFrontend checks if a deployment/statefulset was created via frontend
// by checking for the presence of frontend-specific annotations
func deployViaFrontend(annotations map[string]string) bool {
	if annotations == nil {
		return false
	}
	hasMinReplicas := annotations[MinReplicasKey] != ""
	hasMaxReplicas := annotations[MaxReplicasKey] != ""
	hasResize := annotations[DeployPVCResizeKey] != ""
	return hasMinReplicas || hasMaxReplicas || hasResize
}

// suspendHPA handles HPA suspension logic: reads HPA config, saves to pause annotation, and deletes HPA
// Returns true if annotations were modified, false otherwise
func (r *NamespaceReconciler) suspendHPA(
	ctx context.Context,
	namespace string,
	resourceName string,
	resourceType string,
	annotations map[string]string,
	logger logr.Logger,
) (bool, error) {
	// Try to read HPA
	hpa := &autoscalingv2.HorizontalPodAutoscaler{}
	hpaKey := client.ObjectKey{Name: resourceName, Namespace: namespace}
	err := r.Client.Get(ctx, hpaKey, hpa)

	if err == nil {
		// HPA exists, save its configuration and delete it
		pauseData := &PauseData{
			Target: "",
			Value:  "",
		}

		// Extract HPA configuration
		if len(hpa.Spec.Metrics) > 0 && hpa.Spec.Metrics[0].Resource != nil {
			pauseData.Target = string(hpa.Spec.Metrics[0].Resource.Name)
			if hpa.Spec.Metrics[0].Resource.Target.AverageUtilization != nil {
				pauseData.Value = strconv.Itoa(
					int(*hpa.Spec.Metrics[0].Resource.Target.AverageUtilization),
				)
			}
		}

		// Save pause data to annotation
		pauseJSON, err := json.Marshal(pauseData)
		if err != nil {
			logger.Error(err, "failed to marshal pause data", resourceType, resourceName)
			return false, fmt.Errorf("failed to marshal pause data for %s: %w", resourceName, err)
		}
		annotations[PauseKey] = string(pauseJSON)

		// Delete HPA
		if err := r.Client.Delete(ctx, hpa); err != nil && !errors.IsNotFound(err) {
			logger.Error(err, "failed to delete HPA", resourceType, resourceName)
			return false, fmt.Errorf("failed to delete HPA for %s: %w", resourceName, err)
		}
		logger.Info(
			"Deleted HPA and saved pause data",
			resourceType,
			resourceName,
			"pauseData",
			string(pauseJSON),
		)
		return true, nil
	} else if !errors.IsNotFound(err) {
		// Error reading HPA (not just not found)
		logger.Error(err, "failed to get HPA", resourceType, resourceName)
		return false, fmt.Errorf("failed to get HPA for %s: %w", resourceName, err)
	}

	// HPA not found, set empty pause annotation
	pauseData := &PauseData{
		Target: "",
		Value:  "",
	}
	//nolint:errchkjson
	pauseJSON, _ := json.Marshal(pauseData)
	annotations[PauseKey] = string(pauseJSON)
	logger.V(1).Info("HPA not found, setting empty pause annotation", resourceType, resourceName)
	return true, nil
}

// resumeHPA handles HPA restoration logic: reads pause annotation and creates HPA if needed
// Returns true if annotations were modified, false otherwise
func (r *NamespaceReconciler) resumeHPA(
	ctx context.Context,
	namespace string,
	resourceName string,
	resourceType string,
	resourceKind string,
	annotations map[string]string,
	logger logr.Logger,
) (bool, error) {
	pauseJSON, hasPause := annotations[PauseKey]
	if !hasPause {
		return false, nil
	}

	var pauseData PauseData
	if err := json.Unmarshal([]byte(pauseJSON), &pauseData); err != nil {
		logger.Error(err, "failed to unmarshal pause data", resourceType, resourceName)
		return false, nil
	}

	if pauseData.Target == "" {
		// No HPA config to restore, just remove pause annotation
		delete(annotations, PauseKey)
		return true, nil
	}

	// Restore HPA
	minReplicasStr := annotations[MinReplicasKey]
	maxReplicasStr := annotations[MaxReplicasKey]

	if minReplicasStr == "" || maxReplicasStr == "" {
		// Missing replica configuration, just remove pause annotation
		delete(annotations, PauseKey)
		return true, nil
	}

	var minReplicas, maxReplicas, targetValue int32
	if val, err := strconv.Atoi(minReplicasStr); err == nil {
		//nolint:gosec
		minReplicas = int32(val)
	}
	if val, err := strconv.Atoi(maxReplicasStr); err == nil {
		//nolint:gosec
		maxReplicas = int32(val)
	}
	if val, err := strconv.Atoi(pauseData.Value); err == nil {
		//nolint:gosec
		targetValue = int32(val)
	}

	// Create HPA
	hpa := &autoscalingv2.HorizontalPodAutoscaler{
		ObjectMeta: v12.ObjectMeta{
			Name:      resourceName,
			Namespace: namespace,
		},
		Spec: autoscalingv2.HorizontalPodAutoscalerSpec{
			ScaleTargetRef: autoscalingv2.CrossVersionObjectReference{
				APIVersion: "apps/v1",
				Kind:       resourceKind,
				Name:       resourceName,
			},
			MinReplicas: &minReplicas,
			MaxReplicas: maxReplicas,
			Metrics: []autoscalingv2.MetricSpec{
				{
					Type: autoscalingv2.ResourceMetricSourceType,
					Resource: &autoscalingv2.ResourceMetricSource{
						Name: corev1.ResourceName(pauseData.Target),
						Target: autoscalingv2.MetricTarget{
							Type:               autoscalingv2.UtilizationMetricType,
							AverageUtilization: &targetValue,
						},
					},
				},
			},
		},
	}

	if err := r.Client.Create(ctx, hpa); err != nil && !errors.IsAlreadyExists(err) {
		logger.Error(err, "failed to create HPA", resourceType, resourceName)
		return false, fmt.Errorf("failed to create HPA for %s: %w", resourceName, err)
	}
	logger.Info(
		"Restored HPA",
		resourceType,
		resourceName,
		"target",
		pauseData.Target,
		"value",
		pauseData.Value,
	)

	// Remove pause annotation
	delete(annotations, PauseKey)
	return true, nil
}

func (r *NamespaceReconciler) suspendOrphanPod(ctx context.Context, namespace string) error {
	podList := corev1.PodList{}
	if err := r.Client.List(ctx, &podList, client.InNamespace(namespace)); err != nil {
		return err
	}
	for _, pod := range podList.Items {
		if pod.Spec.SchedulerName == v1.DebtSchedulerName || hasController(pod.OwnerReferences) {
			continue
		}
		clone := pod.DeepCopy()
		clone.ResourceVersion = ""
		clone.Spec.NodeName = ""
		clone.Status = corev1.PodStatus{}
		clone.Spec.SchedulerName = v1.DebtSchedulerName
		if clone.Annotations == nil {
			clone.Annotations = make(map[string]string)
		}
		clone.Annotations[v1.PreviousSchedulerName] = pod.Spec.SchedulerName
		err := r.recreatePod(ctx, pod, clone)
		if err != nil {
			return fmt.Errorf("recreate unowned pod `%s` failed: %w", pod.Name, err)
		}
	}
	return nil
}

func (r *NamespaceReconciler) deleteControlledPod(ctx context.Context, namespace string) error {
	podList := corev1.PodList{}
	if err := r.Client.List(ctx, &podList, client.InNamespace(namespace)); err != nil {
		return err
	}
	for _, pod := range podList.Items {
		if pod.Spec.SchedulerName == v1.DebtSchedulerName || len(pod.OwnerReferences) == 0 {
			r.Log.Info("skip pod", "pod", pod.Name)
			continue
		}
		r.Log.Info("delete pod", "pod", pod.Name)
		err := r.Client.Delete(ctx, &pod)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *NamespaceReconciler) resumeOrphanPod(ctx context.Context, namespace string) error {
	var list corev1.PodList
	if err := r.Client.List(ctx, &list, client.InNamespace(namespace)); err != nil {
		return err
	}
	deleteCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	for _, pod := range list.Items {
		if pod.Status.Phase != v1.PodPhaseSuspended ||
			pod.Spec.SchedulerName != v1.DebtSchedulerName {
			continue
		}

		// Skip if this pod has a controller (not an orphan)
		if hasController(pod.OwnerReferences) {
			continue
		}

		// Only resume orphan pods
		clone := pod.DeepCopy()
		clone.ResourceVersion = ""
		clone.Spec.NodeName = ""
		clone.Status = corev1.PodStatus{}
		if scheduler, ok := clone.Annotations[v1.PreviousSchedulerName]; ok {
			clone.Spec.SchedulerName = scheduler
			delete(clone.Annotations, v1.PreviousSchedulerName)
		} else {
			clone.Spec.SchedulerName = ""
		}
		err := r.recreatePod(deleteCtx, pod, clone)
		if err != nil {
			return fmt.Errorf("recreate orphan pod %s failed: %w", pod.Name, err)
		}
	}
	return nil
}

func (r *NamespaceReconciler) recreatePod(
	ctx context.Context,
	oldPod corev1.Pod,
	newPod *corev1.Pod,
) error {
	list := corev1.PodList{}
	watcher, err := r.Client.Watch(ctx, &list, client.InNamespace(oldPod.Namespace))
	if err != nil {
		return fmt.Errorf("failed to start watch stream for pod %s: %w", oldPod.Name, err)
	}
	ch := watcher.ResultChan()
	err = r.Client.Delete(ctx, &oldPod)
	if err != nil {
		return fmt.Errorf("failed to delete pod %s: %w", oldPod.Name, err)
	}
	for event := range ch {
		if event.Type == watch.Deleted {
			if val, ok := event.Object.(*corev1.Pod); ok && val.Name == oldPod.Name {
				err = r.Client.Create(ctx, newPod)
				if err != nil {
					return fmt.Errorf("failed to recreate pod %s: %w", newPod.Name, err)
				}
				watcher.Stop()
				break
			}
		}
	}
	return nil
}

func (r *NamespaceReconciler) resumeKBCluster(ctx context.Context, namespace string) error {
	logger := r.Log.WithValues("Namespace", namespace, "Function", "resumeKBCluster")

	clusterGVR := schema.GroupVersionResource{
		Group:    "apps.kubeblocks.io",
		Version:  "v1alpha1",
		Resource: "clusters",
	}

	clusterList, err := r.dynamicClient.Resource(clusterGVR).
		Namespace(namespace).
		List(ctx, v12.ListOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			return nil
		}
		return fmt.Errorf("failed to list clusters in namespace %s: %w", namespace, err)
	}

	opsGVR := schema.GroupVersionResource{
		Group:    "apps.kubeblocks.io",
		Version:  "v1alpha1",
		Resource: "opsrequests",
	}

	for _, cluster := range clusterList.Items {
		clusterName := cluster.GetName()
		annotations := cluster.GetAnnotations()
		if annotations == nil {
			annotations = make(map[string]string)
		}

		// Get or create original state with defaults
		var originalState *KBClusterOriginalState
		stateJSON, exists := annotations[OriginalSuspendStateAnnotation]
		if !exists {
			// If no state annotation, use default values: restore to running state
			logger.Info(
				"Cluster has no suspend state, using defaults to restore",
				"Cluster",
				clusterName,
			)
		} else {
			// Decode original state
			var err error
			originalState, err = decodeKBClusterState(stateJSON)
			if err != nil {
				logger.Error(err, "failed to decode cluster state", "cluster", clusterName)
			}
		}
		if originalState == nil {
			originalState = getDefaultKBClusterState()
		}

		logger.Info(
			"Resuming cluster",
			"cluster",
			clusterName,
			"wasRunning",
			originalState.WasRunning,
			"originalBackupEnabled",
			originalState.BackupEnabled,
		)

		// Track if cluster needs update
		needsUpdate := false

		// Restore backup configuration only if it was originally enabled
		if originalState.BackupEnabled {
			backup, hasBackup, err := unstructured.NestedMap(cluster.Object, "spec", "backup")
			if err != nil {
				logger.Error(err, "failed to get backup config", "cluster", clusterName)
			} else if hasBackup && backup != nil {
				if err := unstructured.SetNestedField(cluster.Object, true, "spec", "backup", "enabled"); err != nil {
					logger.Error(err, "failed to restore backup.enabled", "cluster", clusterName)
				} else {
					logger.Info("Restored backup enabled state", "cluster", clusterName, "enabled", true)
					needsUpdate = true
				}
			}
		}

		// Remove original state annotation if it existed
		if exists {
			delete(annotations, OriginalSuspendStateAnnotation)
			needsUpdate = true
		}

		// Update cluster only if there are actual changes
		if needsUpdate {
			cluster.SetAnnotations(annotations)
			_, err := r.dynamicClient.Resource(clusterGVR).
				Namespace(namespace).
				Update(ctx, &cluster, v12.UpdateOptions{})
			if err != nil {
				logger.Error(err, "failed to update cluster", "cluster", clusterName)
				return fmt.Errorf("failed to update cluster %s: %w", clusterName, err)
			}
		}

		// Start the cluster if it was running before suspension
		// No need to check current phase since we're resuming from suspended state
		if originalState.WasRunning {
			opsName := fmt.Sprintf(
				"start-%s-%s",
				clusterName,
				time.Now().Format("2006-01-02-15"),
			)
			opsRequest := &unstructured.Unstructured{}
			opsRequest.SetGroupVersionKind(schema.GroupVersionKind{
				Group:   "apps.kubeblocks.io",
				Version: "v1alpha1",
				Kind:    "OpsRequest",
			})
			opsRequest.SetNamespace(namespace)
			opsRequest.SetName(opsName)

			opsSpec := map[string]any{
				"clusterRef":             clusterName,
				"type":                   "Start",
				"ttlSecondsAfterSucceed": int64(1),
				"ttlSecondsBeforeAbort":  int64(60 * 60),
			}
			if err := unstructured.SetNestedField(opsRequest.Object, opsSpec, "spec"); err != nil {
				return fmt.Errorf(
					"failed to set spec for OpsRequest %s in namespace %s: %w",
					opsName,
					namespace,
					err,
				)
			}

			_, err := r.dynamicClient.Resource(opsGVR).
				Namespace(namespace).
				Create(ctx, opsRequest, v12.CreateOptions{})
			if err != nil && !errors.IsAlreadyExists(err) {
				return fmt.Errorf(
					"failed to create OpsRequest %s in namespace %s: %w",
					opsName,
					namespace,
					err,
				)
			}
			if errors.IsAlreadyExists(err) {
				logger.V(1).
					Info("OpsRequest already exists, skipping creation", "OpsRequest", opsName)
			} else {
				logger.Info("Created start OpsRequest for cluster", "cluster", clusterName, "opsRequest", opsName)
			}
		}
	}
	return nil
}

func (r *NamespaceReconciler) suspendObjectStorage(ctx context.Context, namespace string) error {
	split := strings.Split(namespace, "-")
	user := split[1]
	err := r.setOSUserStatus(ctx, user, Disabled)
	if err != nil {
		r.Log.Error(err, "failed to suspend object storage", "user", user)
		return err
	}
	return nil
}

func (r *NamespaceReconciler) resumeObjectStorage(ctx context.Context, namespace string) error {
	split := strings.Split(namespace, "-")
	user := split[1]
	err := r.setOSUserStatus(ctx, user, Enabled)
	if err != nil {
		r.Log.Error(err, "failed to resume object storage", "user", user)
		return err
	}
	return nil
}

func (r *NamespaceReconciler) setOSUserStatus(ctx context.Context, user, status string) error {
	if r.InternalEndpoint == "" || r.OSNamespace == "" || r.OSAdminSecret == "" {
		r.Log.V(1).Info("the endpoint or namespace or admin secret env of object storage is nil")
		return nil
	}
	if r.OSAdminClient == nil {
		secret := &corev1.Secret{}
		if err := r.Client.Get(ctx, client.ObjectKey{Name: r.OSAdminSecret, Namespace: r.OSNamespace}, secret); err != nil {
			r.Log.Error(
				err,
				"failed to get secret",
				"name",
				r.OSAdminSecret,
				"namespace",
				r.OSNamespace,
			)
			return err
		}
		accessKey := string(secret.Data[OSAccessKey])
		secretKey := string(secret.Data[OSSecretKey])
		oSAdminClient, err := objectstoragev1.NewOSAdminClient(
			r.InternalEndpoint,
			accessKey,
			secretKey,
		)
		if err != nil {
			r.Log.Error(err, "failed to new object storage admin client")
			return err
		}
		r.OSAdminClient = oSAdminClient
	}
	users, err := r.OSAdminClient.ListUsers(ctx)
	if err != nil {
		r.Log.Error(err, "failed to list minio user", "user", user)
		return err
	}
	if _, ok := users[user]; !ok {
		return nil
	}
	err = r.OSAdminClient.SetUserStatus(ctx, user, madmin.AccountStatus(status))
	if err != nil {
		r.Log.Error(err, "failed to set user status", "user", user, "status", status)
		return err
	}
	return nil
}

func (r *NamespaceReconciler) SetupWithManager(
	mgr ctrl.Manager,
	limitOps controller.Options,
	deleteResourceConcurrent int,
) error {
	r.Log = ctrl.Log.WithName("controllers").WithName("Namespace")
	r.OSAdminSecret = os.Getenv(OSAdminSecret)
	r.InternalEndpoint = os.Getenv(OSInternalEndpointEnv)
	r.OSNamespace = os.Getenv(OSNamespace)

	// Initialize semaphore for backup deletion rate limiting
	if deleteResourceConcurrent <= 0 {
		deleteResourceConcurrent = 5
	}
	r.deleteBackupSemaphore = make(chan struct{}, deleteResourceConcurrent)
	r.Log.Info("Initialized backup deletion semaphore", "concurrency", deleteResourceConcurrent)

	config, err := rest.InClusterConfig()
	if err != nil {
		return fmt.Errorf("failed to load in-cluster config: %w", err)
	}
	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return fmt.Errorf("failed to create dynamic client: %w", err)
	}
	r.dynamicClient = dynamicClient
	if r.OSAdminSecret == "" || r.InternalEndpoint == "" || r.OSNamespace == "" {
		r.Log.V(1).
			Info("failed to get the endpoint or namespace or admin secret env of object storage")
	}
	return ctrl.NewControllerManagedBy(mgr).
		For(&corev1.Namespace{}, builder.WithPredicates(AnnotationChangedPredicate{})).
		WithEventFilter(&AnnotationChangedPredicate{}).
		WithOptions(limitOps).
		Complete(r)
}

type AnnotationChangedPredicate struct {
	predicate.Funcs
}

func (AnnotationChangedPredicate) Update(e event.UpdateEvent) bool {
	oldObj, ok1 := e.ObjectOld.(*corev1.Namespace)
	newObj, ok2 := e.ObjectNew.(*corev1.Namespace)
	if !ok1 || !ok2 || newObj.Annotations == nil {
		return false
	}

	oldDebtStatus := oldObj.Annotations[types.DebtNamespaceAnnoStatusKey]
	newDebtStatus := newObj.Annotations[types.DebtNamespaceAnnoStatusKey]
	oldNetworkStatus := oldObj.Annotations[types.NetworkStatusAnnoKey]
	newNetworkStatus := newObj.Annotations[types.NetworkStatusAnnoKey]

	debtChanged := oldDebtStatus != newDebtStatus && !isDebtCompleted(newDebtStatus)
	networkChanged := oldNetworkStatus != newNetworkStatus && !isNetworkCompleted(newNetworkStatus)

	return debtChanged || networkChanged
}

func (AnnotationChangedPredicate) Create(e event.CreateEvent) bool {
	annotations := e.Object.GetAnnotations()
	debtStatus, debtExists := annotations[types.DebtNamespaceAnnoStatusKey]
	networkStatus, networkExists := annotations[types.NetworkStatusAnnoKey]

	return (debtExists && !isDebtCompleted(debtStatus)) ||
		(networkExists && !isNetworkCompleted(networkStatus))
}

// Helper functions to check completed states
func isDebtCompleted(status string) bool {
	return status == types.SuspendCompletedDebtNamespaceAnnoStatus ||
		status == types.FinalDeletionCompletedDebtNamespaceAnnoStatus ||
		status == types.ResumeCompletedDebtNamespaceAnnoStatus ||
		status == types.TerminateSuspendCompletedDebtNamespaceAnnoStatus
}

func isNetworkCompleted(status string) bool {
	return status == types.NetworkSuspendCompleted || status == types.NetworkResumeCompleted
}

func (r *NamespaceReconciler) suspendOrphanCronJob(ctx context.Context, namespace string) error {
	logger := r.Log.WithValues("Namespace", namespace, "Function", "suspendOrphanCronJob")

	cronJobList := batchv1.CronJobList{}
	if err := r.Client.List(ctx, &cronJobList, client.InNamespace(namespace)); err != nil {
		return err
	}

	var errs []error
	for _, cronJob := range cronJobList.Items {
		// Skip if this cronjob has a controller (not an orphan)
		if hasController(cronJob.OwnerReferences) {
			logger.V(1).Info("CronJob has controller, skipping", "CronJob", cronJob.Name)
			continue
		}

		annotations := cronJob.GetAnnotations()
		if annotations == nil {
			annotations = make(map[string]string)
		}

		// Check if already has original state saved
		_, hasOriginalState := annotations[OriginalSuspendStateAnnotation]

		// Get current suspend state
		currentlySuspended := cronJob.Spec.Suspend != nil && *cronJob.Spec.Suspend

		// Track if cronjob needs update
		needsUpdate := false

		// Save original state only if not already saved
		if !hasOriginalState {
			originalState := &CronJobOriginalState{
				Suspend: currentlySuspended,
			}
			stateJSON, err := encodeCronJobState(originalState)
			if err != nil {
				logger.Error(err, "failed to encode cronjob state", "cronjob", cronJob.Name)
				errs = append(
					errs,
					fmt.Errorf("failed to encode cronjob state for %s: %w", cronJob.Name, err),
				)
				continue
			}
			annotations[OriginalSuspendStateAnnotation] = stateJSON
			needsUpdate = true

			logger.Info(
				"Saved cronjob state",
				"cronjob",
				cronJob.Name,
				"originalSuspend",
				currentlySuspended,
			)
		} else {
			logger.V(1).Info("CronJob already has original state, skipping state save", "CronJob", cronJob.Name)
		}

		// Set suspend to true if not already suspended
		if !currentlySuspended {
			cronJob.Spec.Suspend = ptr.To(true)
			needsUpdate = true
		}

		// Update only if there are actual changes
		if needsUpdate {
			cronJob.SetAnnotations(annotations)
			if err := r.Client.Update(ctx, &cronJob); err != nil {
				errs = append(
					errs,
					fmt.Errorf("failed to suspend cronjob %s: %w", cronJob.Name, err),
				)
				continue
			}
			logger.V(1).Info("Suspended cronjob", "cronjob", cronJob.Name)
		} else {
			logger.V(1).Info("CronJob already suspended, skipping update", "cronjob", cronJob.Name)
		}
	}
	return errors2.Join(errs...)
}

func (r *NamespaceReconciler) resumeOrphanCronJob(ctx context.Context, namespace string) error {
	logger := r.Log.WithValues("Namespace", namespace, "Function", "resumeOrphanCronJob")

	cronJobList := batchv1.CronJobList{}
	if err := r.Client.List(ctx, &cronJobList, client.InNamespace(namespace)); err != nil {
		return err
	}

	var errs []error
	for _, cronJob := range cronJobList.Items {
		// Skip if this cronjob has a controller (not an orphan)
		if hasController(cronJob.OwnerReferences) {
			logger.V(1).Info("CronJob has controller, skipping", "CronJob", cronJob.Name)
			continue
		}

		annotations := cronJob.GetAnnotations()
		if annotations == nil {
			annotations = make(map[string]string)
		}

		// Get or create original state with defaults
		var originalState *CronJobOriginalState
		stateJSON, exists := annotations[OriginalSuspendStateAnnotation]
		if !exists {
			// If no state annotation, use default values: resume to not suspended
			logger.Info(
				"CronJob has no suspend state, using defaults to restore",
				"CronJob",
				cronJob.Name,
			)
		} else {
			// Decode original state
			var err error
			originalState, err = decodeCronJobState(stateJSON)
			if err != nil {
				logger.Error(err, "failed to decode cronjob state", "cronjob", cronJob.Name)
			}
		}
		if originalState == nil {
			originalState = getDefaultCronJobState()
		}

		logger.Info(
			"Resuming cronjob",
			"cronjob",
			cronJob.Name,
			"originalSuspend",
			originalState.Suspend,
		)

		// Track if cronjob needs update
		needsUpdate := false

		// Restore original suspend state
		if !originalState.Suspend {
			cronJob.Spec.Suspend = ptr.To(originalState.Suspend)
			needsUpdate = true
		}

		// Remove original state annotation if it existed
		if exists {
			delete(annotations, OriginalSuspendStateAnnotation)
			needsUpdate = true
		}

		// Update only if there are actual changes
		if needsUpdate {
			cronJob.SetAnnotations(annotations)
			if err := r.Client.Update(ctx, &cronJob); err != nil {
				errs = append(
					errs,
					fmt.Errorf("failed to resume cronjob %s: %w", cronJob.Name, err),
				)
				continue
			}
		}
	}
	return errors2.Join(errs...)
}

func (r *NamespaceReconciler) suspendOrphanDeployments(
	ctx context.Context,
	namespace string,
) error {
	logger := r.Log.WithValues("Namespace", namespace, "Function", "suspendOrphanDeployments")

	deployList := appsv1.DeploymentList{}
	if err := r.Client.List(ctx, &deployList, client.InNamespace(namespace)); err != nil {
		return fmt.Errorf("failed to list deployments: %w", err)
	}

	var errs []error
	for _, deploy := range deployList.Items {
		// Skip if this deployment has a controller (not an orphan)
		if hasController(deploy.OwnerReferences) {
			logger.V(1).Info("Deployment has controller, skipping", "Deployment", deploy.Name)
			continue
		}

		annotations := deploy.GetAnnotations()
		if annotations == nil {
			annotations = make(map[string]string)
		}

		// Check if already has original state saved
		_, hasOriginalState := annotations[OriginalSuspendStateAnnotation]

		// Get current replicas
		var replicas int32
		if deploy.Spec.Replicas != nil {
			replicas = *deploy.Spec.Replicas
		} else {
			// If replicas not specified, Kubernetes defaults to 1
			replicas = 1
		}

		// Skip if already 0 replicas and state already saved
		if replicas == 0 && hasOriginalState {
			logger.V(1).Info("Deployment already suspended, skipping", "Deployment", deploy.Name)
			continue
		}

		// Track if deployment needs update
		needsUpdate := false

		// Handle HPA if this deployment was created via frontend
		if deployViaFrontend(annotations) {
			hpaModified, err := r.suspendHPA(
				ctx,
				namespace,
				deploy.Name,
				"deployment",
				annotations,
				logger,
			)
			if err != nil {
				logger.Error(
					err,
					"failed to suspend HPA, continuing with next deployment",
					"deployment",
					deploy.Name,
				)
				continue
			}
			if hpaModified {
				needsUpdate = true
			}
		}

		// Save original state only if not already saved
		if !hasOriginalState {
			originalState := &DeploymentOriginalState{
				Replicas: replicas,
			}
			stateJSON, err := encodeDeploymentState(originalState)
			if err != nil {
				logger.Error(err, "failed to encode deployment state", "deployment", deploy.Name)
				errs = append(
					errs,
					fmt.Errorf("failed to encode deployment state for %s: %w", deploy.Name, err),
				)
				continue
			}
			annotations[OriginalSuspendStateAnnotation] = stateJSON
			needsUpdate = true

			logger.Info(
				"Saved orphan deployment state",
				"deployment",
				deploy.Name,
				"originalReplicas",
				replicas,
			)
		} else {
			logger.V(1).Info("Deployment already has original state, skipping state save", "Deployment", deploy.Name)
		}

		// Set replicas to 0 if not already 0
		if replicas != 0 {
			deploy.Spec.Replicas = ptr.To(int32(0))
			needsUpdate = true
		}

		// Update only if there are actual changes
		if needsUpdate {
			deploy.SetAnnotations(annotations)
			if err := r.Client.Update(ctx, &deploy); err != nil {
				errs = append(
					errs,
					fmt.Errorf("failed to update deployment %s: %w", deploy.Name, err),
				)
				continue
			}
			logger.V(1).Info("Suspended orphan deployment", "deployment", deploy.Name)
		}
	}
	return errors2.Join(errs...)
}

func (r *NamespaceReconciler) resumeOrphanDeployments(ctx context.Context, namespace string) error {
	logger := r.Log.WithValues("Namespace", namespace, "Function", "resumeOrphanDeployments")

	deployList := appsv1.DeploymentList{}
	if err := r.Client.List(ctx, &deployList, client.InNamespace(namespace)); err != nil {
		return fmt.Errorf("failed to list deployments: %w", err)
	}

	var errs []error
	for _, deploy := range deployList.Items {
		// Skip if this deployment has a controller (not an orphan)
		if hasController(deploy.OwnerReferences) {
			logger.V(1).Info("Deployment has controller, skipping", "Deployment", deploy.Name)
			continue
		}

		annotations := deploy.GetAnnotations()
		if annotations == nil {
			annotations = make(map[string]string)
		}

		// Get or create original state with defaults
		var originalState *DeploymentOriginalState
		stateJSON, exists := annotations[OriginalSuspendStateAnnotation]
		if !exists {
			// If no state annotation, use default values: restore to 1 replica
			logger.Info(
				"Deployment has no suspend state, using defaults to restore",
				"Deployment",
				deploy.Name,
			)
		} else {
			// Decode original state
			var err error
			originalState, err = decodeDeploymentState(stateJSON)
			if err != nil {
				logger.Error(err, "failed to decode deployment state", "deployment", deploy.Name)
			}
		}
		if originalState == nil {
			originalState = getDefaultDeploymentState()
		}

		logger.Info(
			"Resuming deployment",
			"deployment",
			deploy.Name,
			"originalReplicas",
			originalState.Replicas,
		)

		// Track if deployment needs update
		needsUpdate := false

		// Restore original replicas only if not 0
		if originalState.Replicas != 0 {
			deploy.Spec.Replicas = ptr.To(originalState.Replicas)
			needsUpdate = true
		}

		// Remove original state annotation if it existed
		if exists {
			delete(annotations, OriginalSuspendStateAnnotation)
			needsUpdate = true
		}

		// Restore HPA only if original replicas was not 0 (meaning it was actually running before suspension)
		// Call resumeHPA before update to modify annotations in one go
		if originalState.Replicas != 0 {
			hpaModified, err := r.resumeHPA(
				ctx,
				namespace,
				deploy.Name,
				"deployment",
				"Deployment",
				annotations,
				logger,
			)
			if err != nil {
				logger.Error(
					err,
					"failed to resume HPA, continuing with next resource",
					"deployment",
					deploy.Name,
				)
				continue
			}
			if hpaModified {
				needsUpdate = true
			}
		}

		// Update only if there are actual changes (single update with all changes)
		if needsUpdate {
			deploy.SetAnnotations(annotations)
			if err := r.Client.Update(ctx, &deploy); err != nil {
				errs = append(
					errs,
					fmt.Errorf("failed to update deployment %s: %w", deploy.Name, err),
				)
				continue
			}
		}
	}
	return errors2.Join(errs...)
}

func (r *NamespaceReconciler) suspendOrphanStatefulSets(
	ctx context.Context,
	namespace string,
) error {
	logger := r.Log.WithValues("Namespace", namespace, "Function", "suspendOrphanStatefulSets")

	stsList := appsv1.StatefulSetList{}
	if err := r.Client.List(ctx, &stsList, client.InNamespace(namespace)); err != nil {
		return fmt.Errorf("failed to list statefulsets: %w", err)
	}

	var errs []error
	for _, sts := range stsList.Items {
		// Skip if this statefulset has a controller (not an orphan)
		if hasController(sts.OwnerReferences) {
			logger.V(1).Info("StatefulSet has controller, skipping", "StatefulSet", sts.Name)
			continue
		}

		annotations := sts.GetAnnotations()
		if annotations == nil {
			annotations = make(map[string]string)
		}

		// Check if already has original state saved
		_, hasOriginalState := annotations[OriginalSuspendStateAnnotation]

		// Get current replicas
		var replicas int32
		if sts.Spec.Replicas != nil {
			replicas = *sts.Spec.Replicas
		} else {
			// If replicas not specified, Kubernetes defaults to 1
			replicas = 1
		}

		// Skip if already 0 replicas and state already saved
		if replicas == 0 && hasOriginalState {
			logger.V(1).Info("StatefulSet already suspended, skipping", "StatefulSet", sts.Name)
			continue
		}

		// Track if statefulset needs update
		needsUpdate := false

		// Handle HPA if this statefulset was created via frontend
		if deployViaFrontend(annotations) {
			hpaModified, err := r.suspendHPA(
				ctx,
				namespace,
				sts.Name,
				"statefulset",
				annotations,
				logger,
			)
			if err != nil {
				logger.Error(
					err,
					"failed to suspend HPA, continuing with next statefulset",
					"statefulset",
					sts.Name,
				)
				continue
			}
			if hpaModified {
				needsUpdate = true
			}
		}

		// Save original state only if not already saved
		if !hasOriginalState {
			originalState := &DeploymentOriginalState{
				Replicas: replicas,
			}
			stateJSON, err := encodeDeploymentState(originalState)
			if err != nil {
				logger.Error(err, "failed to encode statefulset state", "statefulset", sts.Name)
				errs = append(
					errs,
					fmt.Errorf("failed to encode statefulset state for %s: %w", sts.Name, err),
				)
				continue
			}
			annotations[OriginalSuspendStateAnnotation] = stateJSON
			needsUpdate = true

			logger.Info(
				"Saved orphan statefulset state",
				"statefulset",
				sts.Name,
				"originalReplicas",
				replicas,
			)
		} else {
			logger.V(1).Info("StatefulSet already has original state, skipping state save", "StatefulSet", sts.Name)
		}

		// Set replicas to 0 if not already 0
		if replicas != 0 {
			sts.Spec.Replicas = ptr.To(int32(0))
			needsUpdate = true
		}

		// Update only if there are actual changes
		if needsUpdate {
			sts.SetAnnotations(annotations)
			if err := r.Client.Update(ctx, &sts); err != nil {
				errs = append(
					errs,
					fmt.Errorf("failed to update statefulset %s: %w", sts.Name, err),
				)
				continue
			}
			logger.V(1).Info("Suspended orphan statefulset", "statefulset", sts.Name)
		}
	}
	return errors2.Join(errs...)
}

func (r *NamespaceReconciler) resumeOrphanStatefulSets(
	ctx context.Context,
	namespace string,
) error {
	logger := r.Log.WithValues("Namespace", namespace, "Function", "resumeOrphanStatefulSets")

	stsList := appsv1.StatefulSetList{}
	if err := r.Client.List(ctx, &stsList, client.InNamespace(namespace)); err != nil {
		return fmt.Errorf("failed to list statefulsets: %w", err)
	}

	var errs []error
	for _, sts := range stsList.Items {
		// Skip if this statefulset has a controller (not an orphan)
		if hasController(sts.OwnerReferences) {
			logger.V(1).Info("StatefulSet has controller, skipping", "StatefulSet", sts.Name)
			continue
		}

		annotations := sts.GetAnnotations()
		if annotations == nil {
			annotations = make(map[string]string)
		}

		// Get or create original state with defaults
		var originalState *DeploymentOriginalState
		stateJSON, exists := annotations[OriginalSuspendStateAnnotation]
		if !exists {
			// If no state annotation, use default values: restore to 1 replica
			logger.Info(
				"StatefulSet has no suspend state, using defaults to restore",
				"StatefulSet",
				sts.Name,
			)
		} else {
			// Decode original state
			var err error
			originalState, err = decodeDeploymentState(stateJSON)
			if err != nil {
				logger.Error(err, "failed to decode statefulset state", "statefulset", sts.Name)
			}
		}
		if originalState == nil {
			originalState = getDefaultDeploymentState()
		}

		logger.Info(
			"Resuming statefulset",
			"statefulset",
			sts.Name,
			"originalReplicas",
			originalState.Replicas,
		)

		// Track if statefulset needs update
		needsUpdate := false

		// Restore original replicas only if not 0
		if originalState.Replicas != 0 {
			sts.Spec.Replicas = ptr.To(originalState.Replicas)
			needsUpdate = true
		}

		// Remove original state annotation if it existed
		if exists {
			delete(annotations, OriginalSuspendStateAnnotation)
			needsUpdate = true
		}

		// Restore HPA only if original replicas was not 0 (meaning it was actually running before suspension)
		// Call resumeHPA before update to modify annotations in one go
		if originalState.Replicas != 0 {
			hpaModified, err := r.resumeHPA(
				ctx,
				namespace,
				sts.Name,
				"statefulset",
				"StatefulSet",
				annotations,
				logger,
			)
			if err != nil {
				logger.Error(
					err,
					"failed to resume HPA, continuing with next resource",
					"statefulset",
					sts.Name,
				)
				continue
			}
			if hpaModified {
				needsUpdate = true
			}
		}

		// Update only if there are actual changes (single update with all changes)
		if needsUpdate {
			sts.SetAnnotations(annotations)
			if err := r.Client.Update(ctx, &sts); err != nil {
				errs = append(
					errs,
					fmt.Errorf("failed to update statefulset %s: %w", sts.Name, err),
				)
				continue
			}
		}
	}
	return errors2.Join(errs...)
}

func (r *NamespaceReconciler) suspendOrphanReplicaSets(
	ctx context.Context,
	namespace string,
) error {
	logger := r.Log.WithValues("Namespace", namespace, "Function", "suspendOrphanReplicaSets")

	rsList := appsv1.ReplicaSetList{}
	if err := r.Client.List(ctx, &rsList, client.InNamespace(namespace)); err != nil {
		return fmt.Errorf("failed to list replicasets: %w", err)
	}

	var errs []error
	for _, rs := range rsList.Items {
		// Skip if this replicaset has a controller (not an orphan)
		if hasController(rs.OwnerReferences) {
			logger.V(1).Info("ReplicaSet has controller, skipping", "ReplicaSet", rs.Name)
			continue
		}

		annotations := rs.GetAnnotations()
		if annotations == nil {
			annotations = make(map[string]string)
		}

		// Check if already has original state saved
		_, hasOriginalState := annotations[OriginalSuspendStateAnnotation]

		// Get current replicas
		var replicas int32
		if rs.Spec.Replicas != nil {
			replicas = *rs.Spec.Replicas
		} else {
			// If replicas not specified, Kubernetes defaults to 1
			replicas = 1
		}

		// Skip if already 0 replicas and state already saved
		if replicas == 0 && hasOriginalState {
			logger.V(1).Info("ReplicaSet already suspended, skipping", "ReplicaSet", rs.Name)
			continue
		}

		// Track if replicaset needs update
		needsUpdate := false

		// Save original state only if not already saved
		if !hasOriginalState {
			originalState := &DeploymentOriginalState{
				Replicas: replicas,
			}
			stateJSON, err := encodeDeploymentState(originalState)
			if err != nil {
				logger.Error(err, "failed to encode replicaset state", "replicaset", rs.Name)
				errs = append(
					errs,
					fmt.Errorf("failed to encode replicaset state for %s: %w", rs.Name, err),
				)
				continue
			}
			annotations[OriginalSuspendStateAnnotation] = stateJSON
			needsUpdate = true

			logger.Info(
				"Saved orphan replicaset state",
				"replicaset",
				rs.Name,
				"originalReplicas",
				replicas,
			)
		} else {
			logger.V(1).Info("ReplicaSet already has original state, skipping state save", "ReplicaSet", rs.Name)
		}

		// Set replicas to 0 if not already 0
		if replicas != 0 {
			rs.Spec.Replicas = ptr.To(int32(0))
			needsUpdate = true
		}

		// Update only if there are actual changes
		if needsUpdate {
			rs.SetAnnotations(annotations)
			if err := r.Client.Update(ctx, &rs); err != nil {
				errs = append(errs, fmt.Errorf("failed to update replicaset %s: %w", rs.Name, err))
				continue
			}
			logger.V(1).Info("Suspended orphan replicaset", "replicaset", rs.Name)
		}
	}
	return errors2.Join(errs...)
}

func (r *NamespaceReconciler) resumeOrphanReplicaSets(ctx context.Context, namespace string) error {
	logger := r.Log.WithValues("Namespace", namespace, "Function", "resumeOrphanReplicaSets")

	rsList := appsv1.ReplicaSetList{}
	if err := r.Client.List(ctx, &rsList, client.InNamespace(namespace)); err != nil {
		return fmt.Errorf("failed to list replicasets: %w", err)
	}

	var errs []error
	for _, rs := range rsList.Items {
		// Skip if this replicaset has a controller (not an orphan)
		if hasController(rs.OwnerReferences) {
			logger.V(1).Info("ReplicaSet has controller, skipping", "ReplicaSet", rs.Name)
			continue
		}

		annotations := rs.GetAnnotations()
		if annotations == nil {
			annotations = make(map[string]string)
		}

		// Get or create original state with defaults
		var originalState *DeploymentOriginalState
		stateJSON, exists := annotations[OriginalSuspendStateAnnotation]
		if !exists {
			// If no state annotation, use default values: restore to 1 replica
			logger.Info(
				"ReplicaSet has no suspend state, using defaults to restore",
				"ReplicaSet",
				rs.Name,
			)
		} else {
			// Decode original state
			var err error
			originalState, err = decodeDeploymentState(stateJSON)
			if err != nil {
				logger.Error(err, "failed to decode replicaset state", "replicaset", rs.Name)
			}
		}
		if originalState == nil {
			originalState = getDefaultDeploymentState()
		}

		logger.Info(
			"Resuming replicaset",
			"replicaset",
			rs.Name,
			"originalReplicas",
			originalState.Replicas,
		)

		// Track if replicaset needs update
		needsUpdate := false

		// Restore original replicas only if not 0
		if originalState.Replicas != 0 {
			rs.Spec.Replicas = ptr.To(originalState.Replicas)
			needsUpdate = true
		}

		// Remove original state annotation if it existed
		if exists {
			delete(annotations, OriginalSuspendStateAnnotation)
			needsUpdate = true
		}

		// Update only if there are actual changes
		if needsUpdate {
			rs.SetAnnotations(annotations)
			if err := r.Client.Update(ctx, &rs); err != nil {
				errs = append(errs, fmt.Errorf("failed to update replicaset %s: %w", rs.Name, err))
				continue
			}
		}
	}
	return errors2.Join(errs...)
}

func (r *NamespaceReconciler) suspendCertificates(ctx context.Context, namespace string) error {
	logger := r.Log.WithValues("Namespace", namespace, "Function", "suspendCertificates")

	certGVR := schema.GroupVersionResource{
		Group:    "cert-manager.io",
		Version:  "v1",
		Resource: "certificates",
	}

	certList, err := r.dynamicClient.Resource(certGVR).
		Namespace(namespace).
		List(ctx, v12.ListOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			return nil
		}
		return fmt.Errorf("failed to list certificates: %w", err)
	}

	for _, cert := range certList.Items {
		certName := cert.GetName()
		annotations := cert.GetAnnotations()
		if annotations == nil {
			annotations = make(map[string]string)
		}

		// Check if already has original state saved
		_, hasOriginalState := annotations[OriginalSuspendStateAnnotation]

		// Get current disable-reissue annotation value
		currentDisableReissue := annotations[CertManagerDisableReissueAnnotation]

		// Skip if already suspended (has state and disable-reissue is true)
		if hasOriginalState && currentDisableReissue == "true" {
			logger.V(1).Info("Certificate already suspended, skipping", "Certificate", certName)
			continue
		}

		// Track if certificate needs update
		needsUpdate := false

		// Save original state only if not already saved
		if !hasOriginalState {
			// Check if disable-reissue was originally enabled (annotation exists and is "true")
			wasDisabled := currentDisableReissue == "true"

			originalState := &CertificateOriginalState{
				DisableReissue: wasDisabled,
			}
			stateJSON, err := encodeCertificateState(originalState)
			if err != nil {
				logger.Error(err, "failed to encode certificate state", "certificate", certName)
				return fmt.Errorf("failed to encode certificate state for %s: %w", certName, err)
			}
			annotations[OriginalSuspendStateAnnotation] = stateJSON
			needsUpdate = true

			logger.Info(
				"Saved certificate state",
				"certificate",
				certName,
				"wasDisabled",
				wasDisabled,
			)
		} else {
			logger.V(1).Info("Certificate already has original state, skipping state save", "Certificate", certName)
		}

		// Disable certificate reissue if not already set to true
		if currentDisableReissue != "true" {
			annotations[CertManagerDisableReissueAnnotation] = "true"
			needsUpdate = true
		}

		// Update only if there are actual changes
		if needsUpdate {
			cert.SetAnnotations(annotations)
			_, err := r.dynamicClient.Resource(certGVR).
				Namespace(namespace).
				Update(ctx, &cert, v12.UpdateOptions{})
			if err != nil {
				return fmt.Errorf("failed to suspend certificate %s: %w", certName, err)
			}

			logger.V(1).Info("Suspended certificate reissue", "certificate", certName)
		}
	}
	return nil
}

func (r *NamespaceReconciler) resumeCertificates(ctx context.Context, namespace string) error {
	logger := r.Log.WithValues("Namespace", namespace, "Function", "resumeCertificates")

	certGVR := schema.GroupVersionResource{
		Group:    "cert-manager.io",
		Version:  "v1",
		Resource: "certificates",
	}

	certList, err := r.dynamicClient.Resource(certGVR).
		Namespace(namespace).
		List(ctx, v12.ListOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			return nil
		}
		return fmt.Errorf("failed to list certificates: %w", err)
	}

	for _, cert := range certList.Items {
		certName := cert.GetName()
		annotations := cert.GetAnnotations()
		if annotations == nil {
			annotations = make(map[string]string)
		}

		// Get or create original state with defaults
		var originalState *CertificateOriginalState
		stateJSON, exists := annotations[OriginalSuspendStateAnnotation]
		if !exists {
			// If no state annotation, use default values: restore without the annotation
			logger.Info(
				"Certificate has no suspend state, using defaults to restore",
				"Certificate",
				certName,
			)
		} else {
			// Decode original state
			var err error
			originalState, err = decodeCertificateState(stateJSON)
			if err != nil {
				logger.Error(err, "failed to decode certificate state", "certificate", certName)
			}
		}
		if originalState == nil {
			originalState = getDefaultCertificateState()
		}

		logger.Info(
			"Resuming certificate",
			"certificate",
			certName,
			"wasDisabled",
			originalState.DisableReissue,
		)

		// Track if certificate needs update
		needsUpdate := false

		// Remove the annotation if it wasn't disabled before
		if !originalState.DisableReissue {
			delete(annotations, CertManagerDisableReissueAnnotation)
			needsUpdate = true
		}

		// Remove original state annotation if it existed
		if exists {
			delete(annotations, OriginalSuspendStateAnnotation)
			needsUpdate = true
		}

		// Update only if there are actual changes
		if needsUpdate {
			cert.SetAnnotations(annotations)
			_, err = r.dynamicClient.Resource(certGVR).
				Namespace(namespace).
				Update(ctx, &cert, v12.UpdateOptions{})
			if err != nil {
				return fmt.Errorf("failed to resume certificate %s: %w", certName, err)
			}
		}
	}
	return nil
}

func deleteResource(
	ctx context.Context,
	dynamicClient dynamic.Interface,
	resource, namespace string,
) error {
	deletePolicy := v12.DeletePropagationForeground
	var gvr schema.GroupVersionResource
	switch resource {
	case "backup":
		gvr = schema.GroupVersionResource{
			Group:    "dataprotection.kubeblocks.io",
			Version:  "v1alpha1",
			Resource: "backups",
		}
		return deleteResourceListAndWait(dynamicClient, gvr, namespace)
	case "cluster.apps.kubeblocks.io":
		gvr = schema.GroupVersionResource{
			Group:    "apps.kubeblocks.io",
			Version:  "v1alpha1",
			Resource: "clusters",
		}
	case "backupschedules":
		gvr = schema.GroupVersionResource{
			Group:    "dataprotection.kubeblocks.io",
			Version:  "v1alpha1",
			Resource: "backupschedules",
		}
	case "cronjob":
		gvr = schema.GroupVersionResource{Group: "batch", Version: "v1", Resource: "cronjobs"}
	case "objectstorageuser":
		gvr = schema.GroupVersionResource{
			Group:    "objectstorage.sealos.io",
			Version:  "v1",
			Resource: "objectstorageusers",
		}
	case "deploy":
		gvr = schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "deployments"}
	case "sts":
		gvr = schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "statefulsets"}
	case "pvc":
		gvr = schema.GroupVersionResource{
			Group:    "",
			Version:  "v1",
			Resource: "persistentvolumeclaims",
		}
	case "Service":
		gvr = schema.GroupVersionResource{Group: "", Version: "v1", Resource: "services"}
	case "Ingress":
		gvr = schema.GroupVersionResource{
			Group:    "networking.k8s.io",
			Version:  "v1",
			Resource: "ingresses",
		}
	case "Issuer":
		gvr = schema.GroupVersionResource{
			Group:    "cert-manager.io",
			Version:  "v1",
			Resource: "issuers",
		}
	case "Certificate":
		gvr = schema.GroupVersionResource{
			Group:    "cert-manager.io",
			Version:  "v1",
			Resource: "certificates",
		}
	case "HorizontalPodAutoscaler":
		gvr = schema.GroupVersionResource{
			Group:    "autoscaling",
			Version:  "v1",
			Resource: "horizontalpodautoscalers",
		}
	case "instance":
		gvr = schema.GroupVersionResource{
			Group:    "app.sealos.io",
			Version:  "v1",
			Resource: "instances",
		}
	case "job":
		gvr = schema.GroupVersionResource{Group: "batch", Version: "v1", Resource: "jobs"}
	case "app":
		gvr = schema.GroupVersionResource{Group: "app.sealos.io", Version: "v1", Resource: "apps"}
	case "devboxes":
		gvr = schema.GroupVersionResource{
			Group:    "devbox.sealos.io",
			Version:  "v1alpha1",
			Resource: "devboxes",
		}
	case "devboxreleases":
		gvr = schema.GroupVersionResource{
			Group:    "devbox.sealos.io",
			Version:  "v1alpha1",
			Resource: "devboxreleases",
		}
	default:
		return fmt.Errorf("unknown resource: %s", resource)
	}
	err := dynamicClient.Resource(gvr).Namespace(namespace).DeleteCollection(ctx, v12.DeleteOptions{
		PropagationPolicy: &deletePolicy,
	}, v12.ListOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("failed to delete %s: %w", resource, err)
	}
	return nil
}

func (r *NamespaceReconciler) suspendIngresses(ctx context.Context, namespace string) error {
	logger := r.Log.WithValues("Namespace", namespace, "Function", "suspendIngresses")

	ingressList := networkingv1.IngressList{}
	if err := r.Client.List(ctx, &ingressList, client.InNamespace(namespace)); err != nil {
		return fmt.Errorf("failed to list ingresses: %w", err)
	}

	var errs []error
	for _, ingress := range ingressList.Items {
		ingressName := ingress.Name
		annotations := ingress.GetAnnotations()
		if annotations == nil {
			annotations = make(map[string]string)
		}

		// Check if already has original state saved
		_, hasOriginalState := annotations[OriginalSuspendStateAnnotation]

		// Get current ingress class
		currentIngressClass, hasIngressClass := annotations[IngressClassAnnotation]

		// Skip if already suspended (has state and ingress class is "pause")
		if hasOriginalState && currentIngressClass == IngressClassPause {
			logger.V(1).Info("Ingress already suspended, skipping", "Ingress", ingressName)
			continue
		}

		// Track if ingress needs update
		needsUpdate := false

		// Save original state only if not already saved
		if !hasOriginalState {
			// Save the original ingress class (empty string if not set)
			originalIngressClass := ""
			if hasIngressClass {
				originalIngressClass = currentIngressClass
			}

			originalState := &IngressOriginalState{
				IngressClass: originalIngressClass,
			}
			stateJSON, err := encodeIngressState(originalState)
			if err != nil {
				logger.Error(err, "failed to encode ingress state", "ingress", ingressName)
				errs = append(
					errs,
					fmt.Errorf("failed to encode ingress state for %s: %w", ingressName, err),
				)
				continue
			}
			annotations[OriginalSuspendStateAnnotation] = stateJSON
			needsUpdate = true

			logger.Info(
				"Saved ingress state",
				"ingress",
				ingressName,
				"originalIngressClass",
				originalIngressClass,
			)
		} else {
			logger.V(1).Info("Ingress already has original state, skipping state save", "Ingress", ingressName)
		}

		// Change ingress class to "pause" if not already set
		if currentIngressClass != IngressClassPause {
			annotations[IngressClassAnnotation] = IngressClassPause
			needsUpdate = true
		}

		// Update only if there are actual changes
		if needsUpdate {
			ingress.SetAnnotations(annotations)
			if err := r.Client.Update(ctx, &ingress); err != nil {
				errs = append(
					errs,
					fmt.Errorf("failed to suspend ingress %s: %w", ingressName, err),
				)
				continue
			}

			logger.V(1).Info("Suspended ingress", "ingress", ingressName)
		}
	}
	return errors2.Join(errs...)
}

func (r *NamespaceReconciler) resumeIngresses(ctx context.Context, namespace string) error {
	logger := r.Log.WithValues("Namespace", namespace, "Function", "resumeIngresses")

	ingressList := networkingv1.IngressList{}
	if err := r.Client.List(ctx, &ingressList, client.InNamespace(namespace)); err != nil {
		return fmt.Errorf("failed to list ingresses: %w", err)
	}

	var errs []error
	for _, ingress := range ingressList.Items {
		ingressName := ingress.Name
		annotations := ingress.GetAnnotations()
		if annotations == nil {
			annotations = make(map[string]string)
		}

		// Get or create original state with defaults
		var originalState *IngressOriginalState
		stateJSON, exists := annotations[OriginalSuspendStateAnnotation]
		if !exists {
			// If no state annotation, use default: restore to nginx
			logger.Info(
				"Ingress has no suspend state, using defaults to restore",
				"Ingress",
				ingressName,
			)
		} else {
			// Decode original state
			var err error
			originalState, err = decodeIngressState(stateJSON)
			if err != nil {
				logger.Error(err, "failed to decode ingress state", "ingress", ingressName)
			}
		}
		if originalState == nil {
			originalState = getDefaultIngressState()
		}

		logger.Info(
			"Resuming ingress",
			"ingress",
			ingressName,
			"originalIngressClass",
			originalState.IngressClass,
		)

		// Track if ingress needs update
		needsUpdate := false

		// Restore original ingress class
		if originalState.IngressClass != IngressClassPause {
			// Restore to original ingress class
			annotations[IngressClassAnnotation] = originalState.IngressClass
			needsUpdate = true
		}

		// Remove original state annotation if it existed
		if exists {
			delete(annotations, OriginalSuspendStateAnnotation)
			needsUpdate = true
		}

		// Update only if there are actual changes
		if needsUpdate {
			ingress.SetAnnotations(annotations)
			if err := r.Client.Update(ctx, &ingress); err != nil {
				errs = append(errs, fmt.Errorf("failed to resume ingress %s: %w", ingressName, err))
				continue
			}
		}
	}
	return errors2.Join(errs...)
}

func (r *NamespaceReconciler) suspendOrphanJob(ctx context.Context, namespace string) error {
	logger := r.Log.WithValues("Namespace", namespace, "Function", "suspendOrphanJob")

	jobList := batchv1.JobList{}
	if err := r.Client.List(ctx, &jobList, client.InNamespace(namespace)); err != nil {
		return err
	}

	var errs []error
	for _, job := range jobList.Items {
		// Skip if this job has a controller (not an orphan)
		if hasController(job.OwnerReferences) {
			logger.V(1).Info("Job has controller, skipping", "Job", job.Name)
			continue
		}

		annotations := job.GetAnnotations()
		if annotations == nil {
			annotations = make(map[string]string)
		}

		// Check if already has original state saved
		_, hasOriginalState := annotations[OriginalSuspendStateAnnotation]

		// Get current suspend state
		currentlySuspended := job.Spec.Suspend != nil && *job.Spec.Suspend

		// Track if job needs update
		needsUpdate := false

		// Save original state only if not already saved
		if !hasOriginalState {
			originalState := &JobOriginalState{
				Suspend: currentlySuspended,
			}
			stateJSON, err := encodeJobState(originalState)
			if err != nil {
				logger.Error(err, "failed to encode job state", "job", job.Name)
				errs = append(
					errs,
					fmt.Errorf("failed to encode job state for %s: %w", job.Name, err),
				)
				continue
			}
			annotations[OriginalSuspendStateAnnotation] = stateJSON
			needsUpdate = true

			logger.Info(
				"Saved job state",
				"job",
				job.Name,
				"originalSuspend",
				currentlySuspended,
			)
		} else {
			logger.V(1).Info("Job already has original state, skipping state save", "Job", job.Name)
		}

		// Set suspend to true if not already suspended
		if !currentlySuspended {
			job.Spec.Suspend = ptr.To(true)
			needsUpdate = true
		}

		// Update only if there are actual changes
		if needsUpdate {
			job.SetAnnotations(annotations)
			if err := r.Client.Update(ctx, &job); err != nil {
				errs = append(errs, fmt.Errorf("failed to suspend job %s: %w", job.Name, err))
				continue
			}
			logger.V(1).Info("Suspended job", "job", job.Name)
		} else {
			logger.V(1).Info("Job already suspended, skipping update", "job", job.Name)
		}
	}
	return errors2.Join(errs...)
}

func (r *NamespaceReconciler) resumeOrphanJob(ctx context.Context, namespace string) error {
	logger := r.Log.WithValues("Namespace", namespace, "Function", "resumeOrphanJob")

	jobList := batchv1.JobList{}
	if err := r.Client.List(ctx, &jobList, client.InNamespace(namespace)); err != nil {
		return err
	}

	var errs []error
	for _, job := range jobList.Items {
		// Skip if this job has a controller (not an orphan)
		if hasController(job.OwnerReferences) {
			logger.V(1).Info("Job has controller, skipping", "Job", job.Name)
			continue
		}

		annotations := job.GetAnnotations()
		if annotations == nil {
			annotations = make(map[string]string)
		}

		// Get or create original state with defaults
		var originalState *JobOriginalState
		stateJSON, exists := annotations[OriginalSuspendStateAnnotation]
		if !exists {
			// If no state annotation, use default values: resume to not suspended
			logger.Info(
				"Job has no suspend state, using defaults to restore",
				"Job",
				job.Name,
			)
		} else {
			// Decode original state
			var err error
			originalState, err = decodeJobState(stateJSON)
			if err != nil {
				logger.Error(err, "failed to decode job state", "job", job.Name)
			}
		}
		if originalState == nil {
			originalState = getDefaultJobState()
		}

		logger.Info(
			"Resuming job",
			"job",
			job.Name,
			"originalSuspend",
			originalState.Suspend,
		)

		// Track if job needs update
		needsUpdate := false

		// Restore original suspend state
		if !originalState.Suspend {
			job.Spec.Suspend = ptr.To(originalState.Suspend)
			needsUpdate = true
		}

		// Remove original state annotation if it existed
		if exists {
			delete(annotations, OriginalSuspendStateAnnotation)
			needsUpdate = true
		}

		// Update only if there are actual changes
		if needsUpdate {
			job.SetAnnotations(annotations)
			if err := r.Client.Update(ctx, &job); err != nil {
				errs = append(errs, fmt.Errorf("failed to resume job %s: %w", job.Name, err))
				continue
			}
		}
	}
	return errors2.Join(errs...)
}

func deleteResourceListAndWait(
	dynamicClient dynamic.Interface,
	gvr schema.GroupVersionResource,
	namespace string,
) error {
	ctx := context.Background()
	// 列出所有资源
	list, err := dynamicClient.Resource(gvr).Namespace(namespace).List(ctx, v12.ListOptions{})
	if err != nil {
		return fmt.Errorf("failed to list %s in namespace %s: %w", gvr, namespace, err)
	}

	if len(list.Items) == 0 {
		return nil // 无资源需要删除
	}

	// 并发删除：使用WaitGroup和error channel收集错误
	var wg sync.WaitGroup
	errCh := make(chan error, len(list.Items)) // 缓冲channel，避免阻塞
	allErrors := []error{}

	for _, item := range list.Items {
		name := item.GetName()
		wg.Add(1)
		go func(resName string) {
			defer wg.Done()
			if deleteErr := deleteResourceAndWait(dynamicClient, gvr, namespace, resName); deleteErr != nil {
				errCh <- fmt.Errorf("failed to delete %s/%s: %w", gvr, resName, deleteErr)
			}
		}(name)
	}

	// 等待所有Goroutine完成，并收集错误
	go func() {
		wg.Wait()
		close(errCh)
	}()

	for deleteErr := range errCh {
		allErrors = append(allErrors, deleteErr)
	}

	if len(allErrors) > 0 {
		return fmt.Errorf("failed to delete some %s resources: %v", gvr, allErrors)
	}

	return nil
}

func deleteResourceAndWait(
	dynamicClient dynamic.Interface,
	gvr schema.GroupVersionResource,
	namespace, name string,
) error {
	ctx := context.Background()
	deletePolicy := v12.DeletePropagationForeground // 前台删除，等待子资源

	// 执行删除（针对单个资源）
	err := dynamicClient.Resource(gvr).Namespace(namespace).Delete(ctx, name, v12.DeleteOptions{
		PropagationPolicy: &deletePolicy,
	})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("failed to delete %s/%s: %w", gvr, name, err)
	}
	if errors.IsNotFound(err) {
		return nil // 已不存在，无需等待
	}

	// 等待删除完成：轮询Get直到NotFound
	pollInterval := 5 * time.Second
	timeout := 5 * time.Minute // 根据finalizer复杂度调整
	err = wait.PollUntilContextTimeout(ctx, pollInterval, timeout, true,
		func(ctx context.Context) (bool, error) {
			_, getErr := dynamicClient.Resource(gvr).
				Namespace(namespace).
				Get(ctx, name, v12.GetOptions{})
			if errors.IsNotFound(getErr) {
				return true, nil // 成功：资源已删除
			}
			if getErr != nil {
				// API 调用错误（非 NotFound），需要重试但可能需要记录
				if errors.IsServerTimeout(getErr) || errors.IsServiceUnavailable(getErr) {
					// 服务端临时错误，静默重试
					return false, nil
				}
				// 其他错误继续轮询
				return false, nil
			}
			// 资源仍存在：继续轮询，不返回错误（避免打印日志）
			return false, nil
		})
	if err != nil {
		if errors2.Is(ctx.Err(), context.DeadlineExceeded) {
			return fmt.Errorf("timeout waiting for %s/%s to delete after %v", gvr, name, timeout)
		}
		return fmt.Errorf("error waiting for %s/%s to delete: %w", gvr, name, err)
	}
	return nil
}

func (r *NamespaceReconciler) suspendDevboxes(ctx context.Context, namespace string) error {
	logger := r.Log.WithValues("Namespace", namespace, "Function", "suspendDevboxes")

	devboxList := devboxv1alpha1.DevboxList{}
	if err := r.Client.List(ctx, &devboxList, client.InNamespace(namespace)); err != nil {
		if errors.IsNotFound(err) {
			return nil
		}
		return fmt.Errorf("failed to list devboxes in namespace %s: %w", namespace, err)
	}

	var errs []error
	for _, devbox := range devboxList.Items {
		devboxName := devbox.Name
		logger.V(1).Info("Processing devbox", "Devbox", devboxName)

		annotations := devbox.GetAnnotations()
		if annotations == nil {
			annotations = make(map[string]string)
		}

		// Check if already has original state saved
		_, hasOriginalState := annotations[OriginalSuspendStateAnnotation]

		// Get current state
		currentState := string(devbox.Spec.State)

		// Skip if already not running and state already saved
		if currentState != "Running" && hasOriginalState {
			logger.V(1).Info("Devbox already suspended, skipping", "Devbox", devboxName)
			continue
		}

		// Track if devbox needs update
		needsUpdate := false

		// Save original state only if not already saved
		if !hasOriginalState {
			// Determine if devbox was running (state is "Running")
			wasRunning := currentState == "Running"

			originalState := &DevboxOriginalState{
				WasRunning: wasRunning,
			}
			stateJSON, err := encodeDevboxState(originalState)
			if err != nil {
				logger.Error(err, "failed to encode devbox state", "devbox", devboxName)
				errs = append(
					errs,
					fmt.Errorf("failed to encode devbox state for %s: %w", devboxName, err),
				)
				continue
			}
			annotations[OriginalSuspendStateAnnotation] = stateJSON
			needsUpdate = true

			logger.Info(
				"Saved devbox state",
				"devbox",
				devboxName,
				"wasRunning",
				wasRunning,
			)
		} else {
			logger.V(1).Info("Devbox already has original state, skipping state save", "Devbox", devboxName)
		}

		// Set state to Stopped if currently running
		if currentState == "Running" {
			devbox.Spec.State = devboxv1alpha1.DevboxStateStopped
			needsUpdate = true
		}

		// Update only if there are actual changes
		if needsUpdate {
			devbox.SetAnnotations(annotations)
			if err := r.Client.Update(ctx, &devbox); err != nil {
				errs = append(errs, fmt.Errorf("failed to suspend devbox %s: %w", devboxName, err))
				continue
			}
			logger.V(1).Info("Suspended devbox", "devbox", devboxName)
		}
	}
	return errors2.Join(errs...)
}

func (r *NamespaceReconciler) resumeDevboxes(ctx context.Context, namespace string) error {
	logger := r.Log.WithValues("Namespace", namespace, "Function", "resumeDevboxes")

	devboxList := devboxv1alpha1.DevboxList{}
	if err := r.Client.List(ctx, &devboxList, client.InNamespace(namespace)); err != nil {
		if errors.IsNotFound(err) {
			return nil
		}
		return fmt.Errorf("failed to list devboxes in namespace %s: %w", namespace, err)
	}

	var errs []error
	for _, devbox := range devboxList.Items {
		devboxName := devbox.Name
		annotations := devbox.GetAnnotations()
		if annotations == nil {
			annotations = make(map[string]string)
		}

		// Get or create original state with defaults
		var originalState *DevboxOriginalState
		stateJSON, exists := annotations[OriginalSuspendStateAnnotation]
		if !exists {
			// If no state annotation, use default values: restore to Running
			logger.Info(
				"Devbox has no suspend state, using defaults to restore",
				"Devbox",
				devboxName,
			)
		} else {
			// Decode original state
			var err error
			originalState, err = decodeDevboxState(stateJSON)
			if err != nil {
				logger.Error(err, "failed to decode devbox state", "devbox", devboxName)
			}
		}
		if originalState == nil {
			originalState = getDefaultDevboxState()
		}

		logger.Info(
			"Resuming devbox",
			"devbox",
			devboxName,
			"wasRunning",
			originalState.WasRunning,
		)

		// Track if devbox needs update
		needsUpdate := false

		// Restore devbox to Running state only if it was running before suspension
		if originalState.WasRunning {
			devbox.Spec.State = devboxv1alpha1.DevboxStateRunning
			needsUpdate = true
		}

		// Remove original state annotation if it existed
		if exists {
			delete(annotations, OriginalSuspendStateAnnotation)
			needsUpdate = true
		}

		// Update only if there are actual changes
		if needsUpdate {
			devbox.SetAnnotations(annotations)
			if err := r.Client.Update(ctx, &devbox); err != nil {
				errs = append(errs, fmt.Errorf("failed to resume devbox %s: %w", devboxName, err))
				continue
			}
		}
	}
	return errors2.Join(errs...)
}
