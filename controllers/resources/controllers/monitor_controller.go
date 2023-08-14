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
	"strings"
	"sync"
	"time"

	"github.com/labring/sealos/controllers/pkg/common/gpu"

	"golang.org/x/sync/semaphore"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/go-logr/logr"
	infrav1 "github.com/labring/sealos/controllers/infra/api/v1"
	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"
	"github.com/labring/sealos/controllers/pkg/common"
	"github.com/labring/sealos/controllers/pkg/database"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// MonitorReconciler reconciles a Monitor object
type MonitorReconciler struct {
	client.Client
	logr.Logger
	Interval          time.Duration
	Scheme            *runtime.Scheme
	mongoURI          string
	stopCh            chan struct{}
	wg                sync.WaitGroup
	periodicReconcile time.Duration
	NvidiaGpu         map[string]gpu.NvidiaGPU
}

type quantity struct {
	*resource.Quantity
	detail string
}

const (
	namespaceMonitorResources                    = "NAMESPACE-RESOURCES"
	namespaceResourcePod, namespaceResourceInfra = "pod", "infra"
	MaxConcurrencyLimit                          = 1000
)

var namespaceMonitorFuncs = make(map[string]func(ctx context.Context, dbClient database.Interface, namespace *corev1.Namespace) error)

//+kubebuilder:rbac:groups=core,resources=nodes,verbs=get;list;watch
//+kubebuilder:rbac:groups=core,resources=persistentvolumeclaims,verbs=get;list;watch
//+kubebuilder:rbac:groups=core,resources=namespaces,verbs=get;list;watch
//+kubebuilder:rbac:groups=core,resources=pods,verbs=get;list;watch
//+kubebuilder:rbac:groups=core,resources=resourcequotas,verbs=get;list;watch
//+kubebuilder:rbac:groups=core,resources=resourcequotas/status,verbs=get;list;watch
//+kubebuilder:rbac:groups=infra.sealos.io,resources=infras,verbs=get;list;watch
//+kubebuilder:rbac:groups=infra.sealos.io,resources=infras/status,verbs=get;list;watch
//+kubebuilder:rbac:groups=infra.sealos.io,resources=infras/finalizers,verbs=get;list;watch

func NewMonitorReconciler(mgr ctrl.Manager) (*MonitorReconciler, error) {
	r := &MonitorReconciler{
		Client:            mgr.GetClient(),
		Logger:            ctrl.Log.WithName("controllers").WithName("Monitor"),
		stopCh:            make(chan struct{}),
		periodicReconcile: 1 * time.Minute,
		mongoURI:          os.Getenv(database.MongoURI),
	}
	if r.mongoURI == "" {
		return nil, fmt.Errorf("mongo uri is empty")
	}
	r.initNamespaceFuncs()
	err := r.preApply()
	if err != nil {
		return nil, err
	}
	r.NvidiaGpu, err = gpu.GetNodeGpuModel(mgr.GetClient())
	if err != nil {
		return nil, fmt.Errorf("failed to get node gpu model: %v", err)
	}
	r.Logger.Info("get gpu model", "gpu model", r.NvidiaGpu)
	r.startPeriodicReconcile()
	return r, nil
}

func (r *MonitorReconciler) initNamespaceFuncs() {
	res := os.Getenv(namespaceMonitorResources)
	if res == "" {
		res = namespaceResourcePod
	}
	//utils.GetEnvWithDefault(namespaceMonitorResources, namespaceResourcePod), ","
	namespaceResourceList := strings.Split(res, ",")
	for _, res := range namespaceResourceList {
		switch res {
		case namespaceResourcePod:
			namespaceMonitorFuncs[namespaceResourcePod] = r.podResourceUsage
		case namespaceResourceInfra:
			namespaceMonitorFuncs[namespaceResourceInfra] = r.infraResourceUsage
		}
	}
}

func (r *MonitorReconciler) StartReconciler(ctx context.Context) error {
	//select {
	//case namespaceName := <-r.namespaceQueue:
	//	if err := r.processNamespace(ctx, namespaceName); err != nil {
	//		r.Logger.Error(err, "failed to process namespace", "namespace", namespaceName)
	//	}
	//case namespaceList := <-r.namespaceListQueue:
	//	r.Logger.Info("process namespace list", "namespaceList len", len(namespaceList.Items))
	//	if err := r.processNamespaceList(ctx, namespaceList); err != nil {
	//		r.Logger.Error(err, "failed to process namespace", "namespaceList", namespaceList)
	//	}
	//case <-ctx.Done():
	//	r.stopPeriodicReconcile()
	//	return nil
	//}
	<-ctx.Done()
	r.stopPeriodicReconcile()
	return nil
}

func (r *MonitorReconciler) startPeriodicReconcile() {
	r.wg.Add(1)
	go func() {
		defer r.wg.Done()
		waitTime := time.Until(time.Now().Truncate(time.Minute).Add(1 * time.Minute))
		if waitTime > 0 {
			logger.Info("wait for first reconcile", "waitTime", waitTime)
			time.Sleep(waitTime)
		}
		ticker := time.NewTicker(r.periodicReconcile)
		for {
			select {
			case <-ticker.C:
				r.enqueueNamespacesForReconcile()
			case <-r.stopCh:
				ticker.Stop()
				return
			}
		}
	}()
}

func (r *MonitorReconciler) stopPeriodicReconcile() {
	close(r.stopCh)
	r.wg.Wait()
}

func (r *MonitorReconciler) enqueueNamespacesForReconcile() {
	ctx := context.Background()
	r.Logger.Info("enqueue namespaces for reconcile", "time", time.Now().Format(time.RFC3339))

	namespaceList := &corev1.NamespaceList{}
	if err := r.Client.List(ctx, namespaceList); err != nil {
		r.Logger.Error(err, "failed to list namespaces")
		return
	}

	if err := r.processNamespaceList(ctx, namespaceList); err != nil {
		r.Logger.Error(err, "failed to process namespace", "time", time.Now().Format(time.RFC3339))
	}
	//r.namespaceListQueue <- namespaceList

	//for i := range namespaceList.Items {
	//	r.namespaceQueue <- &namespaceList.Items[i]
	//}
}

func (r *MonitorReconciler) processNamespaceList(ctx context.Context, namespaceList *corev1.NamespaceList) error {
	logger.Info("start processNamespaceList", "namespaceList len", len(namespaceList.Items), "time", time.Now().Format(time.RFC3339))
	if len(namespaceList.Items) == 0 {
		r.Logger.Error(fmt.Errorf("no namespace to process"), "")
		return nil
	}
	wg := sync.WaitGroup{}
	wg.Add(len(namespaceList.Items))
	dbCtx := context.Background()
	dbClient, err := database.NewMongoDB(dbCtx, r.mongoURI)
	if err != nil {
		r.Logger.Error(err, "connect mongo client failed")
		return err
	}
	defer func() {
		err := dbClient.Disconnect(dbCtx)
		if err != nil {
			r.Logger.V(5).Info("disconnect mongo client failed", "err", err)
		}
	}()
	concurrencyLimit := len(namespaceList.Items)
	if concurrencyLimit > MaxConcurrencyLimit {
		concurrencyLimit = MaxConcurrencyLimit
	}
	sem := semaphore.NewWeighted(int64(concurrencyLimit))
	for i := range namespaceList.Items {
		go func(namespace *corev1.Namespace) {
			defer wg.Done()
			if err := sem.Acquire(context.Background(), 1); err != nil {
				fmt.Printf("Failed to acquire semaphore: %v\n", err)
				return
			}
			defer sem.Release(1)
			if err := r.processNamespace(ctx, dbClient, namespace); err != nil {
				r.Logger.Error(err, "failed to process namespace", "namespace", namespace.Name)
			}
		}(&namespaceList.Items[i])
	}
	wg.Wait()
	logger.Info("end processNamespaceList", "time", time.Now().Format("2006-01-02 15:04:05"))
	return nil
}

func (r *MonitorReconciler) processNamespace(ctx context.Context, dbClient database.Interface, namespace *corev1.Namespace) error {
	for res := range namespaceMonitorFuncs {
		if err := namespaceMonitorFuncs[res](ctx, dbClient, namespace); err != nil {
			r.Logger.Error(err, "monitor namespace resource", "resource", res, "namespace", namespace.Name)
			return err
		}
	}
	//if err := r.podResourceUsage(ctx, dbClient, namespace); err != nil {
	//	r.Logger.Error(err, "monitor pod resource", "namespace", namespace.Name)
	//	return err
	//}
	//if err = r.infraResourceUsage(ctx, dbClient, namespace.Name); err != nil {
	//	r.Logger.Error(err, "monitor infra resource", "namespace", namespace.Name)
	//	return ctrl.Result{Requeue: true}, err
	//}
	return nil
}

func (r *MonitorReconciler) preApply() error {
	ctx := context.Background()
	dbClient, err := database.NewMongoDB(ctx, r.mongoURI)
	if err != nil {
		return fmt.Errorf("failed to connect mongo: %v", err)
	}
	defer func() {
		err := dbClient.Disconnect(ctx)
		if err != nil {
			r.Error(err, "disconnect mongo client failed")
		}
	}()

	if err = dbClient.CreateMonitorTimeSeriesIfNotExist(time.Now().UTC()); err != nil {
		r.Logger.Error(err, "create table time series failed")
	}
	return nil
}

func (r *MonitorReconciler) podResourceUsage(ctx context.Context, dbClient database.Interface, namespace *corev1.Namespace) error {
	timeStamp := time.Now().UTC()
	var (
		quota   = corev1.ResourceQuota{}
		podList = corev1.PodList{}
	)
	if err := r.List(context.Background(), &podList, &client.ListOptions{Namespace: namespace.Name}); err != nil {
		return err
	}
	rs := initResources()
	hasStorageQuota := false
	if err := r.Get(ctx, client.ObjectKey{Name: meteringv1.ResourceQuotaPrefix + namespace.Name, Namespace: namespace.Name}, &quota); err != nil {
		if client.IgnoreNotFound(err) != nil {
			return err
		}
		//if _, ok := namespace.GetAnnotations()[v1.UserAnnotationOwnerKey]; ok {
		//	r.Logger.Error(fmt.Errorf("resources quota is empty"), "", "namespace", namespace.Name)
		//}
		rs[corev1.ResourceStorage].detail = "no resource quota"
	} else {
		hasStorageQuota = true
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
			// gpu only use limit
			if gpuRequest, ok := container.Resources.Limits[gpu.NvidiaGpuKey]; ok {
				gpuModel, ok := r.NvidiaGpu[pod.Spec.NodeName]
				if !ok {
					var err error
					r.NvidiaGpu, err = gpu.GetNodeGpuModel(r.Client)
					if err != nil {
						logger.Error(err, "get node gpu model failed")
						continue
					}
					gpuModel, ok = r.NvidiaGpu[pod.Spec.NodeName]
					if !ok {
						logger.Error(fmt.Errorf("node %s not found gpu model", pod.Spec.NodeName), "")
						continue
					}
				}
				if _, ok := rs[common.NewGpuResource(gpuModel.GpuInfo.GpuProduct)]; !ok {
					rs[common.NewGpuResource(gpuModel.GpuInfo.GpuProduct)] = initGpuResources()
				}
				logger.Info("gpu request", "pod", pod.Name, "namespace", pod.Namespace, "gpu req", gpuRequest.String(), "node", pod.Spec.NodeName, "gpu model", gpuModel.GpuInfo.GpuProduct)
				rs[common.NewGpuResource(gpuModel.GpuInfo.GpuProduct)].Add(gpuRequest)
			}
		}
	}
	if !hasStorageQuota {
		pvcList := corev1.PersistentVolumeClaimList{}
		if err := r.List(context.Background(), &pvcList, &client.ListOptions{Namespace: namespace.Name}); err != nil {
			return err
		}
		for _, pvc := range pvcList.Items {
			if pvc.Status.Phase != corev1.ClaimBound {
				continue
			}
			rs[corev1.ResourceStorage].Add(pvc.Spec.Resources.Requests[corev1.ResourceStorage])
		}
	}
	var monitors []*common.Monitor
	for resour, value := range rs {
		v := getResourceValue(resour, rs)
		if v > 0 {
			monitors = append(monitors, &common.Monitor{
				Category: namespace.Name,
				Property: resour.String(),
				Value:    v,
				Time:     timeStamp,
				Detail:   value.detail,
			})
		}
	}
	return dbClient.InsertMonitor(ctx, monitors...)
}

func getResourceValue(resourceName corev1.ResourceName, res map[corev1.ResourceName]*quantity) int64 {
	quantity := res[resourceName]
	priceUnit := common.PricesUnit[resourceName]
	if strings.Contains(resourceName.String(), "gpu") {
		priceUnit = common.PricesUnit[common.ResourceGPU]
	}
	if quantity != nil && quantity.MilliValue() != 0 {
		return int64(math.Ceil(float64(quantity.MilliValue()) / float64(priceUnit.MilliValue())))
	}
	return 0
}

func initResources() (rs map[corev1.ResourceName]*quantity) {
	rs = make(map[corev1.ResourceName]*quantity)
	rs[common.ResourceGPU] = initGpuResources()
	rs[corev1.ResourceCPU] = &quantity{Quantity: resource.NewQuantity(0, resource.DecimalSI), detail: ""}
	rs[corev1.ResourceMemory] = &quantity{Quantity: resource.NewQuantity(0, resource.BinarySI), detail: ""}
	rs[corev1.ResourceStorage] = &quantity{Quantity: resource.NewQuantity(0, resource.BinarySI), detail: ""}
	return
}

func initGpuResources() *quantity {
	return &quantity{Quantity: resource.NewQuantity(0, resource.DecimalSI), detail: ""}
}

func (r *MonitorReconciler) infraResourceUsage(ctx context.Context, dbClient database.Interface, namespace *corev1.Namespace) error {
	var infraList infrav1.InfraList
	if err := r.List(ctx, &infraList, client.InNamespace(namespace.Name)); err != nil {
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
	if cpuUsage != 0 {
		monitors = append(monitors, &common.Monitor{
			Category: namespace.Name,
			Property: common.PropertyInfraCPU,
			Value:    cpuUsage,
			Time:     timeStamp,
			//Detail:   "",
		})
	}
	if memUsage != 0 {
		monitors = append(monitors, &common.Monitor{
			Category: namespace.Name,
			Property: common.PropertyInfraMemory,
			Value:    memUsage,
			Time:     timeStamp,
			//Detail:   "",
		})
	}
	if storUsage != 0 {
		monitors = append(monitors, &common.Monitor{
			Category: namespace.Name,
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
