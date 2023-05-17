/*
Copyright 2023 sealos.

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
	"math"
	"os"
	"time"

	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"
	"github.com/labring/sealos/controllers/pkg/common"
	"github.com/labring/sealos/controllers/pkg/database"
	v1 "github.com/labring/sealos/controllers/user/api/v1"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	"github.com/go-logr/logr"
	infrav1 "github.com/labring/sealos/controllers/infra/api/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

// MonitorReconciler reconciles a Monitor object
type MonitorReconciler struct {
	client.Client
	logr.Logger
	Interval  time.Duration
	Scheme    *runtime.Scheme
	mongoOpts struct {
		uri      string
		username string
		password string
	}
}

type quantity struct {
	*resource.Quantity
	detail string
}

//+kubebuilder:rbac:groups=core,resources=namespaces,verbs=get;list;watch
//+kubebuilder:rbac:groups=core,resources=namespaces,verbs=get;list
//+kubebuilder:rbac:groups=core,resources=pods,verbs=get;list;watch
//+kubebuilder:rbac:groups=core,resources=resourcequotas,verbs=get;list;watch
//+kubebuilder:rbac:groups=core,resources=resourcequotas/status,verbs=get;list;watch
//+kubebuilder:rbac:groups=infra.sealos.io,resources=infras,verbs=get;list;watch
//+kubebuilder:rbac:groups=infra.sealos.io,resources=infras/status,verbs=get;list;watch
//+kubebuilder:rbac:groups=infra.sealos.io,resources=infras/finalizers,verbs=get;list;watch

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Monitor object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.11.2/pkg/reconcile
func (r *MonitorReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	_ = log.FromContext(ctx)

	//TODO get mongo connect url from configmap or secret
	dbCtx := context.Background()
	dbClient, err := database.NewMongoDB(dbCtx, r.mongoOpts.uri)
	if err != nil {
		r.Logger.Error(err, "connect mongo client failed")
		return ctrl.Result{Requeue: true}, err
	}
	defer func() {
		err := dbClient.Disconnect(dbCtx)
		if err != nil {
			r.Logger.V(5).Info("disconnect mongo client failed", "err", err)
		}
	}()

	var namespace corev1.Namespace
	if err = r.Get(ctx, req.NamespacedName, &namespace); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	if err = r.podResourceUsage(ctx, dbClient, namespace); err != nil {
		r.Logger.Error(err, "monitor pod resource", "namespace", namespace.Name)
		return ctrl.Result{Requeue: true}, err
	}
	if err = r.infraResourceUsage(ctx, dbClient, namespace.Name); err != nil {
		r.Logger.Error(err, "monitor infra resource", "namespace", namespace.Name)
		return ctrl.Result{Requeue: true}, err
	}

	return ctrl.Result{Requeue: true, RequeueAfter: 1 * time.Minute}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *MonitorReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.Logger = log.Log.WithName("monitor-controller")
	//TODO get interval
	r.Interval = time.Minute
	//TODO get mongo connect url from configmap or secret
	//r.mongoConnectUrl = "mongodb://192.168.64.17:27017"
	r.mongoOpts = struct {
		uri      string
		username string
		password string
	}{
		uri:      os.Getenv(database.MongoURL),
		username: os.Getenv(database.MongoUsername),
		password: os.Getenv(database.MongoPassword),
	}
	switch {
	case r.mongoOpts.uri == "":
		return fmt.Errorf("mongo uri is empty")
	}
	if err := r.preApply(); err != nil {
		return err
	}
	return ctrl.NewControllerManagedBy(mgr).
		For(&corev1.Namespace{}, builder.WithPredicates(predicate.Funcs{
			CreateFunc: func(createEvent event.CreateEvent) bool {
				return true
			},
			UpdateFunc: func(updateEvent event.UpdateEvent) bool {
				return false
			},
			DeleteFunc: func(deleteEvent event.DeleteEvent) bool {
				return false
			},
			GenericFunc: func(genericEvent event.GenericEvent) bool {
				return false
			},
		})).
		Complete(r)
}

func (r *MonitorReconciler) preApply() error {
	ctx := context.Background()
	dbClient, err := database.NewMongoDB(ctx, r.mongoOpts.uri)
	//mongoClient, err := mongo.Connect(ctx, options.Client().ApplyURI(r.mongoOpts.uri).SetAuth(options.Credential{Username: r.mongoOpts.username, Password: r.mongoOpts.password}))
	if err != nil {
		return fmt.Errorf("failed to connect mongo: %v", err)
	}
	defer func() {
		err := dbClient.Disconnect(ctx)
		if err != nil {
			r.Error(err, "disconnect mongo client failed")
		}
	}()

	//_ = createCompoundIndex(mongoClient, SealosResourcesDBName, SealosMonitorCollectionName)
	if err = dbClient.CreateMonitorTimeSeriesIfNotExist(time.Now().UTC()); err != nil {
		r.Logger.Error(err, "create table time series failed")
	}
	return nil
}

func (r *MonitorReconciler) podResourceUsage(ctx context.Context, dbClient database.Interface, namespace corev1.Namespace) error {
	timeStamp := time.Now().UTC()
	var (
		quota   = corev1.ResourceQuota{}
		podList = corev1.PodList{}
	)
	if err := r.List(context.Background(), &podList, &client.ListOptions{Namespace: namespace.Name}); err != nil {
		return err
	}
	rs := initResources()
	if err := r.Get(ctx, client.ObjectKey{Name: meteringv1.ResourceQuotaPrefix + namespace.Name, Namespace: namespace.Name}, &quota); err != nil {
		if client.IgnoreNotFound(err) != nil {
			return err
		}
		if _, ok := namespace.GetAnnotations()[v1.UserAnnotationOwnerKey]; ok {
			//+kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=rolebindings,verbs=get;list;watch;create;update;patch;delete
			//+kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=roles,verbs=get;list;watch;create;update;patch;delete
			//if err = r.syncResourceQuota(ctx, namespace.Name); err != nil {
			//	r.Logger.Error(err, "sync resource quota failed", "namespace", namespace.Name)
			//}
			r.Logger.Error(fmt.Errorf("resources quota is empty"), "", "namespace", namespace.Name)
		}
		rs[corev1.ResourceStorage].detail = "no resource quota"
	} else {
		rs[corev1.ResourceStorage].Add(*quota.Status.Used.Name("requests.storage", resource.BinarySI))
	}
	for _, pod := range podList.Items {
		// TODO pending status need skip?
		if pod.Status.Phase != corev1.PodRunning /*&& pod.Status.Phase != corev1.PodPending*/ {
			continue
		}
		for _, container := range pod.Spec.Containers {
			if cpuRequest, ok := container.Resources.Limits[corev1.ResourceCPU]; ok {
				rs[corev1.ResourceCPU].Add(cpuRequest)
			} else {
				rs[corev1.ResourceCPU].Add(container.Resources.Requests[corev1.ResourceCPU])
			}
			if memoryRequest, ok := container.Resources.Limits[corev1.ResourceMemory]; ok {
				rs[corev1.ResourceMemory].Add(memoryRequest)
			} else {
				rs[corev1.ResourceMemory].Add(container.Resources.Requests[corev1.ResourceMemory])
			}
		}
	}
	err := dbClient.InsertMonitor(ctx, &common.Monitor{
		Category: namespace.Name,
		Property: corev1.ResourceCPU.String(),
		Value:    getResourceValue(corev1.ResourceCPU, rs),
		Time:     timeStamp,
		Detail:   rs[corev1.ResourceCPU].String(),
	}, &common.Monitor{
		Category: namespace.Name,
		Property: corev1.ResourceMemory.String(),
		Value:    getResourceValue(corev1.ResourceMemory, rs),
		Time:     timeStamp,
		Detail:   rs[corev1.ResourceMemory].String(),
	}, &common.Monitor{
		Category: namespace.Name,
		Property: corev1.ResourceStorage.String(),
		Value:    getResourceValue(corev1.ResourceStorage, rs),
		Time:     timeStamp,
		Detail:   rs[corev1.ResourceStorage].String(),
	})
	return err
}

//func (r *MonitorReconciler) syncResourceQuota(ctx context.Context, nsName string) error {
//	quota := &corev1.ResourceQuota{
//		ObjectMeta: metav1.ObjectMeta{
//			Name:      controllers.ResourceQuotaPrefix + nsName,
//			Namespace: nsName,
//		},
//	}
//
//	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, quota, func() error {
//		quota.Spec.Hard = controllers.DefaultResourceQuota()
//		return nil
//	}); err != nil {
//		return fmt.Errorf("sync resource quota failed: %v", err)
//	}
//	return nil
//}

//func getResourceValue(resourceName corev1.ResourceName, quantity *resource.Quantity) int64 {
//	if quantity != nil && quantity.MilliValue() != 0 {
//		return int64(math.Ceil(float64(quantity.MilliValue()) / float64(common.PricesUnit[resourceName].MilliValue())))
//	}
//	return 0
//}

func getResourceValue(resourceName corev1.ResourceName, res map[corev1.ResourceName]*quantity) int64 {
	quantity := res[resourceName]
	if quantity != nil && quantity.MilliValue() != 0 {
		return int64(math.Ceil(float64(quantity.MilliValue()) / float64(common.PricesUnit[resourceName].MilliValue())))
	}
	return 0
}

func initResources() (rs map[corev1.ResourceName]*quantity) {
	rs = make(map[corev1.ResourceName]*quantity)
	rs[corev1.ResourceCPU] = &quantity{Quantity: resource.NewQuantity(0, resource.DecimalSI), detail: ""}
	rs[corev1.ResourceMemory] = &quantity{Quantity: resource.NewQuantity(0, resource.BinarySI), detail: ""}
	rs[corev1.ResourceStorage] = &quantity{Quantity: resource.NewQuantity(0, resource.BinarySI), detail: ""}
	return
}

func (r *MonitorReconciler) infraResourceUsage(ctx context.Context, dbClient database.Interface, namespace string) error {
	var infraList infrav1.InfraList

	if err := r.List(ctx, &infraList, client.InNamespace(namespace)); err != nil {
		return err
	}
	if len(infraList.Items) == 0 {
		return nil
	}
	timeStamp := time.Now().UTC()
	infraResources := initResources()
	for i := range infraList.Items {
		infra := infraList.Items[i]
		//TODO if infra is not running, skip it,  what about pending/failed/unknown?
		if !r.checkInfraStatusRunning(infra) {
			continue
		}
		for _, host := range infra.Spec.Hosts {
			cnt := host.Count
			flavor := host.Flavor
			//unified infra unit: getInfraCPUQuantity/getInfraMemoryQuantity/getInfraDiskQuantity
			infraResources[corev1.ResourceCPU].Add(*common.GetInfraCPUQuantity(flavor, cnt))
			infraResources[corev1.ResourceMemory].Add(*common.GetInfraMemoryQuantity(flavor, cnt))
			for _, disk := range host.Disks {
				infraResources[corev1.ResourceStorage].Add(*common.GetInfraDiskQuantity(disk.Capacity))
			}
		}
		r.Logger.Info("infra resources", "namespace", infra.Namespace, "cpu quantity", infraResources[corev1.ResourceCPU], "memory quantity", infraResources[corev1.ResourceMemory], "volume quantity", infraResources[corev1.ResourceStorage])
	}
	cpuUsage, memUsage, storUsage := getResourceValue(corev1.ResourceCPU, infraResources),
		getResourceValue(corev1.ResourceMemory, infraResources),
		getResourceValue(corev1.ResourceStorage, infraResources)
	var monitors []*common.Monitor
	switch {
	case cpuUsage != 0:
		monitors = append(monitors, &common.Monitor{
			Category: namespace,
			Property: common.PropertyInfraCPU,
			Value:    cpuUsage,
			Time:     timeStamp,
			//Detail:   "",
		})
		fallthrough
	case memUsage != 0:
		monitors = append(monitors, &common.Monitor{
			Category: namespace,
			Property: common.PropertyInfraMemory,
			Value:    memUsage,
			Time:     timeStamp,
			//Detail:   "",
		})
		fallthrough
	case storUsage != 0:
		monitors = append(monitors, &common.Monitor{
			Category: namespace,
			Property: common.PropertyInfraDisk,
			Value:    storUsage,
			Time:     timeStamp,
			//Detail:   "",
		})
	}
	return dbClient.InsertMonitor(ctx, monitors...)
}

// checkInfraStatus check infra status
func (r *MonitorReconciler) checkInfraStatusRunning(infra infrav1.Infra) bool {
	if infra.Status.Status == infrav1.Running.String() {
		return true
	}
	r.Logger.Info("infra status is not running", "infra name", infra.Name, "infra namespace", infra.Namespace, "infra status", infra.Status.Status)
	return false
}
