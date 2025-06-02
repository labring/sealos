/*
Copyright 2023.

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

package controllers

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"sigs.k8s.io/controller-runtime/pkg/controller"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	objectstoragev1 "github/labring/sealos/controllers/objectstorage/api/v1"

	//kbv1alpha1 "github.com/apecloud/kubeblocks/apis/apps/v1alpha1"
	"github.com/go-logr/logr"
	v1 "github.com/labring/sealos/controllers/account/api/v1"
	"github.com/minio/madmin-go/v3"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	v12 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/watch"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
	"k8s.io/utils/ptr"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
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

func (r *NamespaceReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := r.Log.WithValues("Namespace", req.Namespace, "Name", req.NamespacedName)

	ns := corev1.Namespace{}
	if err := r.Client.Get(ctx, req.NamespacedName, &ns); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	if ns.Status.Phase == corev1.NamespaceTerminating {
		logger.V(1).Info("namespace is terminating")
		return ctrl.Result{}, nil
	}

	debtStatus, ok := ns.Annotations[v1.DebtNamespaceAnnoStatusKey]
	if !ok {
		logger.Error(fmt.Errorf("no debt status"), "no debt status")
		return ctrl.Result{}, nil
	}
	logger.V(1).Info("debt status", "status", debtStatus)
	// Skip if namespace is in any completed state
	if debtStatus == v1.SuspendCompletedDebtNamespaceAnnoStatus ||
		debtStatus == v1.FinalDeletionCompletedDebtNamespaceAnnoStatus ||
		debtStatus == v1.ResumeCompletedDebtNamespaceAnnoStatus ||
		debtStatus == v1.TerminateSuspendCompletedDebtNamespaceAnnoStatus {
		logger.V(1).Info("Skipping completed namespace")
		return ctrl.Result{}, nil
	}

	switch debtStatus {
	case v1.SuspendDebtNamespaceAnnoStatus, v1.TerminateSuspendDebtNamespaceAnnoStatus:
		if err := r.SuspendUserResource(ctx, req.NamespacedName.Name); err != nil {
			logger.Error(err, "suspend namespace resources failed")
			return ctrl.Result{}, err
		}
		// Update to corresponding completed state
		newStatus := v1.SuspendCompletedDebtNamespaceAnnoStatus
		if debtStatus == v1.TerminateSuspendDebtNamespaceAnnoStatus {
			newStatus = v1.TerminateSuspendCompletedDebtNamespaceAnnoStatus
		}
		ns.Annotations[v1.DebtNamespaceAnnoStatusKey] = newStatus
		if err := r.Client.Update(ctx, &ns); err != nil {
			logger.Error(err, "update namespace status to completed failed")
			return ctrl.Result{}, err
		}
	case v1.FinalDeletionDebtNamespaceAnnoStatus:
		if err := r.DeleteUserResource(ctx, req.NamespacedName.Name); err != nil {
			logger.Error(err, "delete namespace resources failed")
			return ctrl.Result{
				Requeue:      true,
				RequeueAfter: 10 * time.Minute,
			}, err
		}
		ns.Annotations[v1.DebtNamespaceAnnoStatusKey] = v1.FinalDeletionCompletedDebtNamespaceAnnoStatus
		if err := r.Client.Update(ctx, &ns); err != nil {
			logger.Error(err, "update namespace status to FinalDeletionCompleted failed")
			return ctrl.Result{}, err
		}
	case v1.ResumeDebtNamespaceAnnoStatus:
		if err := r.ResumeUserResource(ctx, req.NamespacedName.Name); err != nil {
			logger.Error(err, "resume namespace resources failed")
			return ctrl.Result{}, err
		}
		ns.Annotations[v1.DebtNamespaceAnnoStatusKey] = v1.ResumeCompletedDebtNamespaceAnnoStatus
		if err := r.Client.Update(ctx, &ns); err != nil {
			logger.Error(err, "update namespace status to ResumeCompleted failed")
			return ctrl.Result{}, err
		}
	case v1.NormalDebtNamespaceAnnoStatus:
		// No action needed for Normal state
	default:
		logger.Error(fmt.Errorf("unknown namespace debt status, change to normal"), "", "debt status", ns.Annotations[v1.DebtNamespaceAnnoStatusKey])
		ns.Annotations[v1.DebtNamespaceAnnoStatusKey] = v1.NormalDebtNamespaceAnnoStatus
		if err := r.Client.Update(ctx, &ns); err != nil {
			logger.Error(err, "update namespace status failed")
			return ctrl.Result{}, err
		}
	}
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

func (r *NamespaceReconciler) limitResourceQuotaCreate(ctx context.Context, namespace string) error {
	limitQuota := GetLimit0ResourceQuota(namespace)
	_, err := ctrl.CreateOrUpdate(ctx, r.Client, limitQuota, func() error {
		return nil
	})
	return err
}

func (r *NamespaceReconciler) limitResourceQuotaDelete(ctx context.Context, namespace string) error {
	limitQuota := GetLimit0ResourceQuota(namespace)
	err := r.Client.Delete(ctx, limitQuota)
	return client.IgnoreNotFound(err)
}

func GetLimit0ResourceQuota(namespace string) *corev1.ResourceQuota {
	quota := corev1.ResourceQuota{}
	quota.Name = "debt-limit0"
	quota.Namespace = namespace
	quota.Spec.Hard = corev1.ResourceList{
		corev1.ResourceLimitsCPU:        resource.MustParse("0"),
		corev1.ResourceLimitsMemory:     resource.MustParse("0"),
		corev1.ResourceRequestsStorage:  resource.MustParse("0"),
		corev1.ResourceEphemeralStorage: resource.MustParse("0"),
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
	clusterList, err := r.dynamicClient.Resource(clusterGVR).Namespace(namespace).List(ctx, v12.ListOptions{})
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
			phase, _ := status.(map[string]interface{})["phase"].(string)
			if phase == "Stopped" || phase == "Stopping" {
				logger.V(1).Info("Cluster already stopped or stopping, skipping", "Cluster", clusterName)
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
		opsSpec := map[string]interface{}{
			"clusterRef":             clusterName,
			"type":                   "Stop",
			"ttlSecondsAfterSucceed": int64(1),
			"ttlSecondsBeforeAbort":  int64(60 * 60),
		}
		if err := unstructured.SetNestedField(opsRequest.Object, opsSpec, "spec"); err != nil {
			return fmt.Errorf("failed to set spec for OpsRequest %s in namespace %s: %w", opsName, namespace, err)
		}

		_, err = r.dynamicClient.Resource(opsGVR).Namespace(namespace).Create(ctx, opsRequest, v12.CreateOptions{})
		if err != nil && !errors.IsAlreadyExists(err) {
			return fmt.Errorf("failed to create OpsRequest %s in namespace %s: %w", opsName, namespace, err)
		}
		if errors.IsAlreadyExists(err) {
			logger.V(1).Info("OpsRequest already exists, skipping creation", "OpsRequest", opsName)
		}
	}
	return nil
}

//func (r *NamespaceReconciler) suspendKBCluster(ctx context.Context, namespace string) error {
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
		if pod.Spec.SchedulerName == v1.DebtSchedulerName || len(pod.ObjectMeta.OwnerReferences) > 0 {
			continue
		}
		clone := pod.DeepCopy()
		clone.ObjectMeta.ResourceVersion = ""
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
		if pod.Spec.SchedulerName == v1.DebtSchedulerName || len(pod.ObjectMeta.OwnerReferences) == 0 {
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
		if pod.Status.Phase != v1.PodPhaseSuspended || pod.Spec.SchedulerName != v1.DebtSchedulerName {
			continue
		}
		if len(pod.ObjectMeta.OwnerReferences) > 0 {
			err := r.Client.Delete(deleteCtx, &pod)
			if err != nil {
				return fmt.Errorf("delete pod %s failed: %v", pod.Name, err)
			}
		} else {
			clone := pod.DeepCopy()
			clone.ObjectMeta.ResourceVersion = ""
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
				return fmt.Errorf("recreate unowned pod %s failed: %v", pod.Name, err)
			}
		}
	}
	return nil
}

func (r *NamespaceReconciler) recreatePod(ctx context.Context, oldPod corev1.Pod, newPod *corev1.Pod) error {
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

func (r *NamespaceReconciler) setOSUserStatus(ctx context.Context, user string, status string) error {
	if r.InternalEndpoint == "" || r.OSNamespace == "" || r.OSAdminSecret == "" {
		r.Log.V(1).Info("the endpoint or namespace or admin secret env of object storage is nil")
		return nil
	}
	if r.OSAdminClient == nil {
		secret := &corev1.Secret{}
		if err := r.Client.Get(ctx, client.ObjectKey{Name: r.OSAdminSecret, Namespace: r.OSNamespace}, secret); err != nil {
			r.Log.Error(err, "failed to get secret", "name", r.OSAdminSecret, "namespace", r.OSNamespace)
			return err
		}
		accessKey := string(secret.Data[OSAccessKey])
		secretKey := string(secret.Data[OSSecretKey])
		oSAdminClient, err := objectstoragev1.NewOSAdminClient(r.InternalEndpoint, accessKey, secretKey)
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

func (r *NamespaceReconciler) SetupWithManager(mgr ctrl.Manager, limitOps controller.Options) error {
	r.Log = ctrl.Log.WithName("controllers").WithName("Namespace")
	r.OSAdminSecret = os.Getenv(OSAdminSecret)
	r.InternalEndpoint = os.Getenv(OSInternalEndpointEnv)
	r.OSNamespace = os.Getenv(OSNamespace)
	config, err := rest.InClusterConfig()
	if err != nil {
		return fmt.Errorf("failed to load in-cluster config: %v", err)
	}
	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return fmt.Errorf("failed to create dynamic client: %v", err)
	}
	r.dynamicClient = dynamicClient
	if r.OSAdminSecret == "" || r.InternalEndpoint == "" || r.OSNamespace == "" {
		r.Log.V(1).Info("failed to get the endpoint or namespace or admin secret env of object storage")
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
	oldStatus := oldObj.Annotations[v1.DebtNamespaceAnnoStatusKey]
	newStatus := newObj.Annotations[v1.DebtNamespaceAnnoStatusKey]
	return oldStatus != newStatus && newStatus != v1.SuspendCompletedDebtNamespaceAnnoStatus &&
		newStatus != v1.FinalDeletionCompletedDebtNamespaceAnnoStatus &&
		newStatus != v1.ResumeCompletedDebtNamespaceAnnoStatus &&
		newStatus != v1.TerminateSuspendCompletedDebtNamespaceAnnoStatus
}

func (AnnotationChangedPredicate) Create(e event.CreateEvent) bool {
	status, ok := e.Object.GetAnnotations()[v1.DebtNamespaceAnnoStatusKey]
	return ok && status != v1.NormalDebtNamespaceAnnoStatus &&
		status != v1.SuspendCompletedDebtNamespaceAnnoStatus &&
		status != v1.FinalDeletionCompletedDebtNamespaceAnnoStatus &&
		status != v1.ResumeCompletedDebtNamespaceAnnoStatus &&
		status != v1.TerminateSuspendCompletedDebtNamespaceAnnoStatus
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
		gvr = schema.GroupVersionResource{Group: "dataprotection.kubeblocks.io", Version: "v1alpha1", Resource: "backups"}
	case "cluster.apps.kubeblocks.io":
		gvr = schema.GroupVersionResource{Group: "apps.kubeblocks.io", Version: "v1alpha1", Resource: "clusters"}
	case "backupschedules":
		gvr = schema.GroupVersionResource{Group: "dataprotection.kubeblocks.io", Version: "v1alpha1", Resource: "backupschedules"}
	case "cronjob":
		gvr = schema.GroupVersionResource{Group: "batch", Version: "v1", Resource: "cronjobs"}
	case "objectstorageuser":
		gvr = schema.GroupVersionResource{Group: "objectstorage.sealos.io", Version: "v1", Resource: "objectstorageusers"}
	case "deploy":
		gvr = schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "deployments"}
	case "sts":
		gvr = schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "statefulsets"}
	case "pvc":
		gvr = schema.GroupVersionResource{Group: "", Version: "v1", Resource: "persistentvolumeclaims"}
	case "Service":
		gvr = schema.GroupVersionResource{Group: "", Version: "v1", Resource: "services"}
	case "Ingress":
		gvr = schema.GroupVersionResource{Group: "networking.k8s.io", Version: "v1", Resource: "ingresses"}
	case "Issuer":
		gvr = schema.GroupVersionResource{Group: "cert-manager.io", Version: "v1", Resource: "issuers"}
	case "Certificate":
		gvr = schema.GroupVersionResource{Group: "cert-manager.io", Version: "v1", Resource: "certificates"}
	case "HorizontalPodAutoscaler":
		gvr = schema.GroupVersionResource{Group: "autoscaling", Version: "v1", Resource: "horizontalpodautoscalers"}
	case "instance":
		gvr = schema.GroupVersionResource{Group: "app.sealos.io", Version: "v1", Resource: "instances"}
	case "job":
		gvr = schema.GroupVersionResource{Group: "batch", Version: "v1", Resource: "jobs"}
	case "app":
		gvr = schema.GroupVersionResource{Group: "app.sealos.io", Version: "v1", Resource: "apps"}
	case "devboxes":
		gvr = schema.GroupVersionResource{Group: "devbox.sealos.io", Version: "v1alpha1", Resource: "devboxes"}
	case "devboxreleases":
		gvr = schema.GroupVersionResource{Group: "devbox.sealos.io", Version: "v1alpha1", Resource: "devboxreleases"}
	default:
		return fmt.Errorf("unknown resource: %s", resource)
	}
	err := dynamicClient.Resource(gvr).Namespace(namespace).DeleteCollection(ctx, v12.DeleteOptions{
		PropagationPolicy: &deletePolicy,
	}, v12.ListOptions{})
	if err != nil && !errors.IsNotFound(err) {
		return fmt.Errorf("failed to delete %s: %v", resource, err)
	}
	return nil
}
