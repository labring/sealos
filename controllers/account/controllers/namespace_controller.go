package controllers

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/go-logr/logr"
	v1 "github.com/labring/sealos/controllers/account/api/v1"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/minio/madmin-go/v3"
	// kbv1alpha1 "github.com/apecloud/kubeblocks/apis/apps/v1alpha1"
	objectstoragev1 "github/labring/sealos/controllers/objectstorage/api/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	v12 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
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
	Client           client.WithWatch
	dynamicClient    dynamic.Interface
	Log              logr.Logger
	Scheme           *runtime.Scheme
	OSAdminClient    *madmin.AdminClient
	OSNamespace      string
	OSAdminSecret    string
	InternalEndpoint string
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

	debtStatus, debtExists := ns.Annotations[types.DebtNamespaceAnnoStatusKey]
	networkStatus, networkExists := ns.Annotations[types.NetworkStatusAnnoKey]
	if !debtExists && !networkExists {
		logger.V(1).Info("No debt or network status annotations found")
		return ctrl.Result{}, nil
	}

	if ns.Annotations == nil {
		ns.Annotations = make(map[string]string)
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
				logger.Info(
					"update namespace anno ",
					"debt status",
					t.newDebt,
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
	pipelines := []func(context.Context, string) error{
		r.suspendKBCluster,
		r.suspendOrphanPod,
		r.limitResourceQuotaCreate,
		r.deleteControlledPod,
		r.suspendCronJob,
		r.suspendObjectStorage,
	}
	for _, fn := range pipelines {
		if err := fn(ctx, namespace); err != nil {
			return err
		}
	}
	return nil
}

func (r *NamespaceReconciler) DeleteUserResource(_ context.Context, namespace string) error {
	deleteResources := []string{
		"backup", "cluster.apps.kubeblocks.io", "backupschedules", "devboxes", "devboxreleases", "cronjob",
		"objectstorageuser", "deploy", "sts", "pvc", "Service", "Ingress",
		"Issuer", "Certificate", "HorizontalPodAutoscaler", "instance",
		"job", "app",
	}
	errChan := make(chan error, len(deleteResources))
	for _, rs := range deleteResources {
		go func(resource string) {
			errChan <- deleteResource(r.dynamicClient, resource, namespace)
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
		r.limitResourceQuotaDelete,
		r.resumePod,
		r.resumeObjectStorage,
	}
	for _, fn := range pipelines {
		if err := fn(ctx, namespace); err != nil {
			return err
		}
	}
	return nil
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

		// Check if the cluster is already stopped or stopping
		status, exists := cluster.Object["status"]
		if exists && status != nil {
			phase, _ := status.(map[string]any)["phase"].(string)
			if phase == "Stopped" || phase == "Stopping" {
				logger.V(1).
					Info("Cluster already stopped or stopping, skipping", "Cluster", clusterName)
				continue
			}
		}

		// Create OpsRequest resource
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

func (r *NamespaceReconciler) suspendOrphanPod(ctx context.Context, namespace string) error {
	podList := corev1.PodList{}
	if err := r.Client.List(ctx, &podList, client.InNamespace(namespace)); err != nil {
		return err
	}
	for _, pod := range podList.Items {
		if pod.Spec.SchedulerName == v1.DebtSchedulerName || len(pod.OwnerReferences) > 0 {
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

func (r *NamespaceReconciler) resumePod(ctx context.Context, namespace string) error {
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
		if len(pod.OwnerReferences) > 0 {
			err := r.Client.Delete(deleteCtx, &pod)
			if err != nil {
				return fmt.Errorf("delete pod %s failed: %w", pod.Name, err)
			}
		} else {
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
				return fmt.Errorf("recreate unowned pod %s failed: %w", pod.Name, err)
			}
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
) error {
	r.Log = ctrl.Log.WithName("controllers").WithName("Namespace")
	r.OSAdminSecret = os.Getenv(OSAdminSecret)
	r.InternalEndpoint = os.Getenv(OSInternalEndpointEnv)
	r.OSNamespace = os.Getenv(OSNamespace)
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

func (r *NamespaceReconciler) suspendCronJob(ctx context.Context, namespace string) error {
	cronJobList := batchv1.CronJobList{}
	if err := r.Client.List(ctx, &cronJobList, client.InNamespace(namespace)); err != nil {
		return err
	}
	for _, cronJob := range cronJobList.Items {
		if cronJob.Spec.Suspend != nil && *cronJob.Spec.Suspend {
			continue
		}
		cronJob.Spec.Suspend = ptr.To(true)
		if err := r.Client.Update(ctx, &cronJob); err != nil {
			return fmt.Errorf("failed to suspend cronjob %s: %w", cronJob.Name, err)
		}
	}
	return nil
}

func deleteResource(dynamicClient dynamic.Interface, resource, namespace string) error {
	ctx := context.Background()
	deletePolicy := v12.DeletePropagationForeground
	var gvr schema.GroupVersionResource
	switch resource {
	case "backup":
		gvr = schema.GroupVersionResource{
			Group:    "dataprotection.kubeblocks.io",
			Version:  "v1alpha1",
			Resource: "backups",
		}
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
