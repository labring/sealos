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

	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/controllers/pkg/utils/env"

	"golang.org/x/sync/semaphore"

	"k8s.io/apimachinery/pkg/selection"

	"k8s.io/apimachinery/pkg/labels"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"

	"github.com/labring/sealos/controllers/user/controllers/helper/config"

	"github.com/minio/minio-go/v7"

	objstorage "github.com/labring/sealos/controllers/pkg/objectstorage"

	"github.com/go-logr/logr"

	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/gpu"
	"github.com/labring/sealos/controllers/pkg/resources"
	"github.com/labring/sealos/controllers/pkg/utils/logger"
	"github.com/labring/sealos/controllers/pkg/utils/retry"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// MonitorReconciler reconciles a Monitor object
type MonitorReconciler struct {
	client.Client
	logr.Logger
	Interval                 time.Duration
	Scheme                   *runtime.Scheme
	stopCh                   chan struct{}
	wg                       sync.WaitGroup
	periodicReconcile        time.Duration
	NvidiaGpu                map[string]gpu.NvidiaGPU
	gpuMutex                 sync.Mutex
	DBClient                 database.Interface
	TrafficClient            database.Interface
	Properties               *resources.PropertyTypeLS
	PromURL                  string
	currentObjectMetrics     map[string]objstorage.MetricData
	ObjStorageClient         *minio.Client
	ObjStorageMetricsClient  *objstorage.MetricsClient
	ObjStorageUserBackupSize map[string]int64
	ObjectStorageInstance    string
}

type quantity struct {
	*resource.Quantity
	detail string
}

const (
	PrometheusURL         = "PROM_URL"
	ObjectStorageInstance = "OBJECT_STORAGE_INSTANCE"
	ConcurrentLimit       = "CONCURRENT_LIMIT"
)

var concurrentLimit = int64(DefaultConcurrencyLimit)

const (
	DefaultConcurrencyLimit = 1000
)

//+kubebuilder:rbac:groups=core,resources=nodes,verbs=get;list;watch
//+kubebuilder:rbac:groups=core,resources=persistentvolumeclaims,verbs=get;list;watch
//+kubebuilder:rbac:groups=core,resources=namespaces,verbs=get;list;watch
//+kubebuilder:rbac:groups=core,resources=pods,verbs=get;list;watch
//+kubebuilder:rbac:groups=core,resources=resourcequotas,verbs=get;list;watch
//+kubebuilder:rbac:groups=core,resources=resourcequotas/status,verbs=get;list;watch
//+kubebuilder:rbac:groups=infra.sealos.io,resources=infras,verbs=get;list;watch
//+kubebuilder:rbac:groups=infra.sealos.io,resources=infras/status,verbs=get;list;watch
//+kubebuilder:rbac:groups=infra.sealos.io,resources=infras/finalizers,verbs=get;list;watch
//+kubebuilder:rbac:groups=core,resources=services,verbs=get;list;watch
//+kubebuilder:rbac:groups=core,resources=services/status,verbs=get;list;watch

func NewMonitorReconciler(mgr ctrl.Manager) (*MonitorReconciler, error) {
	r := &MonitorReconciler{
		Client:                mgr.GetClient(),
		Logger:                ctrl.Log.WithName("controllers").WithName("Monitor"),
		stopCh:                make(chan struct{}),
		periodicReconcile:     1 * time.Minute,
		PromURL:               os.Getenv(PrometheusURL),
		ObjectStorageInstance: os.Getenv(ObjectStorageInstance),
		NvidiaGpu:             make(map[string]gpu.NvidiaGPU),
	}
	concurrentLimit = env.GetInt64EnvWithDefault(ConcurrentLimit, DefaultConcurrencyLimit)
	var err error
	err = retry.Retry(2, 1*time.Second, func() error {
		r.NvidiaGpu, err = gpu.GetNodeGpuModel(mgr.GetClient())
		if err != nil {
			return fmt.Errorf("failed to get node gpu model: %v", err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	r.Logger.Info("get gpu model", "gpu model", r.NvidiaGpu)
	return r, nil
}

func InitIndexField(mgr ctrl.Manager) error {
	if err := mgr.GetFieldIndexer().IndexField(context.Background(), &corev1.PersistentVolumeClaim{}, "status.phase", func(rawObj client.Object) []string {
		pvc := rawObj.(*corev1.PersistentVolumeClaim)
		return []string{string(pvc.Status.Phase)}
	}); err != nil {
		return err
	}
	return mgr.GetFieldIndexer().IndexField(context.Background(), &corev1.Service{}, "spec.type", func(rawObj client.Object) []string {
		svc := rawObj.(*corev1.Service)
		return []string{string(svc.Spec.Type)}
	})
}

func (r *MonitorReconciler) StartReconciler(ctx context.Context) error {
	r.startPeriodicReconcile()
	if r.TrafficClient != nil || r.ObjStorageClient != nil {
		r.startMonitorTraffic()
	}
	<-ctx.Done()
	r.stopPeriodicReconcile()
	return nil
}

func (r *MonitorReconciler) startPeriodicReconcile() {
	r.wg.Add(1)
	go func() {
		defer r.wg.Done()
		waitNextMinute()
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

func (r *MonitorReconciler) getNamespaceList() (*corev1.NamespaceList, error) {
	namespaceList := &corev1.NamespaceList{}
	req, err := labels.NewRequirement(userv1.UserLabelOwnerKey, selection.Exists, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create label requirement: %v", err)
	}
	return namespaceList, r.List(context.Background(), namespaceList, &client.ListOptions{
		LabelSelector: labels.NewSelector().Add(*req),
	})
}

func waitNextMinute() {
	waitTime := time.Until(time.Now().Truncate(time.Minute).Add(1 * time.Minute))
	if waitTime > 0 {
		logger.Info("wait for first reconcile", "waitTime", waitTime)
		time.Sleep(waitTime)
	}
}

func waitNextHour() {
	waitTime := time.Until(time.Now().Truncate(time.Hour).Add(1 * time.Hour))
	if waitTime > 0 {
		logger.Info("wait for first reconcile", "waitTime", waitTime)
		time.Sleep(waitTime)
	}
}

func (r *MonitorReconciler) startMonitorTraffic() {
	r.wg.Add(1)
	go func() {
		defer r.wg.Done()
		startTime, endTime := time.Now().UTC(), time.Now().Truncate(time.Hour).Add(1*time.Hour).UTC()
		waitNextHour()
		ticker := time.NewTicker(1 * time.Hour)
		if err := r.MonitorTrafficUsed(startTime, endTime); err != nil {
			r.Logger.Error(err, "failed to monitor pod traffic used")
		}
		for {
			select {
			case <-ticker.C:
				startTime, endTime = endTime, endTime.Add(1*time.Hour)
				if err := r.MonitorTrafficUsed(startTime, endTime); err != nil {
					r.Logger.Error(err, "failed to monitor pod traffic used")
					break
				}
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
	r.Logger.Info("enqueue namespaces for reconcile", "time", time.Now().Format(time.RFC3339))

	namespaceList, err := r.getNamespaceList()
	if err != nil {
		r.Logger.Error(err, "failed to list namespaces")
		return
	}

	if err := r.processNamespaceList(namespaceList); err != nil {
		r.Logger.Error(err, "failed to process namespace", "time", time.Now().Format(time.RFC3339))
	}
}

func (r *MonitorReconciler) processNamespaceList(namespaceList *corev1.NamespaceList) error {
	logger.Info("start processNamespaceList", "namespaceList len", len(namespaceList.Items), "time", time.Now().Format(time.RFC3339))
	if len(namespaceList.Items) == 0 {
		r.Logger.Error(fmt.Errorf("no namespace to process"), "")
		return nil
	}
	if err := r.preMonitorResourceUsage(); err != nil {
		r.Logger.Error(err, "failed to pre monitor resource usage")
	}
	sem := semaphore.NewWeighted(concurrentLimit)
	wg := sync.WaitGroup{}
	wg.Add(len(namespaceList.Items))
	for i := range namespaceList.Items {
		go func(namespace *corev1.Namespace) {
			defer wg.Done()
			if err := sem.Acquire(context.Background(), 1); err != nil {
				fmt.Printf("Failed to acquire semaphore: %v\n", err)
				return
			}
			defer sem.Release(1)
			if err := r.monitorResourceUsage(namespace); err != nil {
				r.Logger.Error(err, "monitor pod resource", "namespace", namespace.Name)
			}
		}(&namespaceList.Items[i])
	}
	wg.Wait()
	logger.Info("end processNamespaceList", "time", time.Now().Format("2006-01-02 15:04:05"))
	return nil
}

func (r *MonitorReconciler) preMonitorResourceUsage() error {
	if r.ObjStorageMetricsClient != nil {
		metrics, err := objstorage.QueryUserUsage(r.ObjStorageMetricsClient)
		if err != nil {
			return fmt.Errorf("failed to query object storage metrics: %w", err)
		}
		r.currentObjectMetrics = metrics
		logger.Info("success query object storage resource usage", "time", time.Now().Format("2006-01-02 15:04:05"))
	}
	if r.ObjStorageClient != nil {
		r.ObjStorageUserBackupSize = objstorage.GetUserBakFileSize(r.ObjStorageClient)
		logger.Info("success query object storage backup size", "time", time.Now().Format("2006-01-02 15:04:05"))
	}
	return nil
}

func (r *MonitorReconciler) monitorResourceUsage(namespace *corev1.Namespace) error {
	timeStamp := time.Now().UTC()
	resUsed := map[string]map[corev1.ResourceName]*quantity{}
	resNamed := make(map[string]*resources.ResourceNamed)

	if err := r.monitorPodResourceUsage(namespace.Name, resUsed, resNamed); err != nil {
		return fmt.Errorf("failed to monitor pod resource usage: %v", err)
	}

	if err := r.monitorPVCResourceUsage(namespace.Name, resUsed, resNamed); err != nil {
		return fmt.Errorf("failed to monitor PVC resource usage: %v", err)
	}

	if err := r.monitorDatabaseBackupUsage(namespace.Name, resUsed, resNamed); err != nil {
		return fmt.Errorf("failed to monitor backup resource usage: %v", err)
	}

	if err := r.monitorServiceResourceUsage(namespace.Name, resUsed, resNamed); err != nil {
		return fmt.Errorf("failed to monitor service resource usage: %v", err)
	}

	if err := r.monitorObjectStorageUsage(namespace.Name, resUsed, resNamed); err != nil {
		return fmt.Errorf("failed to get object storage resource usage: %v", err)
	}

	var monitors []*resources.Monitor

	for name, podResource := range resUsed {
		isEmpty, used := r.getResourceUsed(podResource)
		if isEmpty {
			continue
		}
		monitors = append(monitors, &resources.Monitor{
			Category: namespace.Name,
			Used:     used,
			Time:     timeStamp,
			Type:     resNamed[name].Type(),
			Name:     resNamed[name].Name(),
		})
	}
	return r.DBClient.InsertMonitor(context.Background(), monitors...)
}

func (r *MonitorReconciler) monitorPodResourceUsage(namespace string, resUsed map[string]map[corev1.ResourceName]*quantity, resNamed map[string]*resources.ResourceNamed) error {
	podList := &corev1.PodList{}
	if err := r.List(context.Background(), podList, &client.ListOptions{
		Namespace: namespace,
	}); err != nil {
		return fmt.Errorf("failed to list pods: %v", err)
	}

	for i := range podList.Items {
		pod := &podList.Items[i]
		if pod.Spec.NodeName == "" || pod.Status.Phase == corev1.PodSucceeded && time.Since(pod.Status.StartTime.Time) > 1*time.Minute {
			continue
		}
		podResNamed := resources.NewResourceNamed(pod)
		resNamed[podResNamed.String()] = podResNamed
		if resUsed[podResNamed.String()] == nil {
			resUsed[podResNamed.String()] = initResources()
		}
		// skip pods that do not start for more than 1 minute
		skip := pod.Status.Phase != corev1.PodRunning && (pod.Status.StartTime == nil || time.Since(pod.Status.StartTime.Time) > 1*time.Minute)
		for _, container := range pod.Spec.Containers {
			// gpu only use limit and not ignore pod pending status
			if gpuRequest, ok := container.Resources.Limits[gpu.NvidiaGpuKey]; ok {
				if err := r.getGPUResourceUsage(pod, gpuRequest, resUsed[podResNamed.String()]); err != nil {
					r.Logger.Error(err, "get gpu resource usage failed", "pod", pod.Name)
				}
			}
			if skip {
				continue
			}
			if cpuRequest, ok := container.Resources.Limits[corev1.ResourceCPU]; ok {
				resUsed[podResNamed.String()][corev1.ResourceCPU].Add(cpuRequest)
			} else {
				resUsed[podResNamed.String()][corev1.ResourceCPU].Add(container.Resources.Requests[corev1.ResourceCPU])
			}
			if memoryRequest, ok := container.Resources.Limits[corev1.ResourceMemory]; ok {
				resUsed[podResNamed.String()][corev1.ResourceMemory].Add(memoryRequest)
			} else {
				resUsed[podResNamed.String()][corev1.ResourceMemory].Add(container.Resources.Requests[corev1.ResourceMemory])
			}
		}
	}
	return nil
}

func (r *MonitorReconciler) monitorPVCResourceUsage(namespace string, resUsed map[string]map[corev1.ResourceName]*quantity, resNamed map[string]*resources.ResourceNamed) error {
	pvcList := &corev1.PersistentVolumeClaimList{}
	if err := r.List(context.Background(), pvcList, &client.ListOptions{
		Namespace:     namespace,
		FieldSelector: fields.OneTermEqualSelector("status.phase", string(corev1.ClaimBound)),
	}); err != nil {
		return fmt.Errorf("failed to list pvc: %v", err)
	}
	for i := range pvcList.Items {
		pvc := &pvcList.Items[i]
		if len(pvc.OwnerReferences) > 0 && pvc.OwnerReferences[0].Kind == "BackupRepo" {
			continue
		}
		pvcRes := resources.NewResourceNamed(pvc)
		if resUsed[pvcRes.String()] == nil {
			resNamed[pvcRes.String()] = pvcRes
			resUsed[pvcRes.String()] = initResources()
		}
		resUsed[pvcRes.String()][corev1.ResourceStorage].Add(pvc.Spec.Resources.Requests[corev1.ResourceStorage])
	}
	return nil
}

func (r *MonitorReconciler) monitorDatabaseBackupUsage(namespace string, resUsed map[string]map[corev1.ResourceName]*quantity, resNamed map[string]*resources.ResourceNamed) error {
	if r.ObjStorageUserBackupSize == nil {
		return nil
	}
	backupSize := r.ObjStorageUserBackupSize[getBackupObjectStorageName(namespace)]
	if backupSize <= 0 {
		return nil
	}

	backupRes := resources.NewObjStorageResourceNamed("DB-BACKUP")
	if resUsed[backupRes.String()] == nil {
		resNamed[backupRes.String()] = backupRes
		resUsed[backupRes.String()] = initResources()
	}
	resUsed[backupRes.String()][corev1.ResourceStorage].Add(*resource.NewQuantity(backupSize, resource.BinarySI))
	return nil
}

func (r *MonitorReconciler) monitorServiceResourceUsage(namespace string, resUsed map[string]map[corev1.ResourceName]*quantity, resNamed map[string]*resources.ResourceNamed) error {
	svcList := &corev1.ServiceList{}
	if err := r.List(context.Background(), svcList, &client.ListOptions{
		Namespace:     namespace,
		FieldSelector: fields.OneTermEqualSelector("spec.type", string(corev1.ServiceTypeNodePort)),
	}); err != nil {
		return fmt.Errorf("failed to list svc: %v", err)
	}
	for i := range svcList.Items {
		svc := &svcList.Items[i]
		if len(svc.Spec.Ports) == 0 {
			continue
		}
		port := make(map[int32]struct{})
		for _, svcPort := range svc.Spec.Ports {
			port[svcPort.NodePort] = struct{}{}
		}
		svcRes := resources.NewResourceNamed(svc)
		if resUsed[svcRes.String()] == nil {
			resNamed[svcRes.String()] = svcRes
			resUsed[svcRes.String()] = initResources()
		}
		// nodeport 1:1000, the measurement is quantity 1000
		resUsed[svcRes.String()][corev1.ResourceServicesNodePorts].Add(*resource.NewQuantity(int64(1000*len(port)), resource.BinarySI))
	}
	return nil
}

func getBackupObjectStorageName(namespace string) string {
	return strings.TrimPrefix(namespace, "ns-")
}

func (r *MonitorReconciler) getResourceUsed(podResource map[corev1.ResourceName]*quantity) (bool, map[uint8]int64) {
	used := map[uint8]int64{}
	isEmpty := true
	for i := range podResource {
		if podResource[i].MilliValue() == 0 {
			continue
		}
		isEmpty = false
		if pType, ok := r.Properties.StringMap[i.String()]; ok {
			used[pType.Enum] = int64(math.Ceil(float64(podResource[i].MilliValue()) / float64(pType.Unit.MilliValue())))
			continue
		}
		r.Logger.Error(fmt.Errorf("not found resource type"), "resource", i.String())
	}
	return isEmpty, used
}

func (r *MonitorReconciler) monitorObjectStorageUsage(namespace string, resMap map[string]map[corev1.ResourceName]*quantity, namedMap map[string]*resources.ResourceNamed) error {
	username := config.GetUserNameByNamespace(namespace)
	if r.currentObjectMetrics == nil || r.currentObjectMetrics[username].Usage == nil {
		return nil
	}
	for bucket, usage := range r.currentObjectMetrics[username].Usage {
		if bucket == "" || usage <= 0 {
			continue
		}
		objStorageNamed := resources.NewObjStorageResourceNamed(bucket)
		namedMap[objStorageNamed.String()] = objStorageNamed
		if _, ok := resMap[objStorageNamed.String()]; !ok {
			resMap[objStorageNamed.String()] = initResources()
		}
		resMap[objStorageNamed.String()][corev1.ResourceStorage].Add(*resource.NewQuantity(usage, resource.BinarySI))
	}
	return nil
}

func (r *MonitorReconciler) MonitorTrafficUsed(startTime, endTime time.Time) error {
	logger.Info("start getTrafficUsed", "startTime", startTime.Format(time.RFC3339), "endTime", endTime.Format(time.RFC3339))
	execTime := time.Now().UTC()
	if r.TrafficClient != nil {
		if err := r.monitorPodTrafficUsed(startTime, endTime); err != nil {
			r.Logger.Error(err, "failed to monitor pod traffic used")
		}
	}
	if r.ObjStorageClient != nil {
		if err := r.monitorObjectStorageTrafficUsed(startTime, endTime); err != nil {
			r.Logger.Error(err, "failed to monitor object storage traffic used")
		}
	}
	r.Logger.Info("success to monitor pod traffic used", "startTime", startTime.Format(time.RFC3339), "endTime", endTime.Format(time.RFC3339), "execTime", time.Since(execTime).String())
	return nil
}

func (r *MonitorReconciler) monitorObjectStorageTrafficUsed(startTime, endTime time.Time) error {
	buckets, err := objstorage.ListAllObjectStorageBucket(r.ObjStorageClient)
	if err != nil {
		return fmt.Errorf("failed to list object storage buckets: %w", err)
	}
	r.Logger.Info("object storage buckets", "buckets len", len(buckets))
	wg, _ := errgroup.WithContext(context.Background())
	wg.SetLimit(10)
	for i := range buckets {
		bucket := buckets[i]
		if !strings.Contains(bucket, "-") {
			continue
		}
		wg.Go(func() error {
			return r.handlerObjectStorageTrafficUsed(startTime, endTime, bucket)
		})
	}
	return wg.Wait()
}

func (r *MonitorReconciler) handlerObjectStorageTrafficUsed(startTime, endTime time.Time, bucket string) error {
	bytes, err := objstorage.GetObjectStorageFlow(r.PromURL, bucket, r.ObjectStorageInstance, startTime, endTime)
	if err != nil {
		return fmt.Errorf("failed to get object storage flow: %w", err)
	}
	unit := r.Properties.StringMap[resources.ResourceNetwork].Unit
	used := int64(math.Ceil(float64(resource.NewQuantity(bytes, resource.BinarySI).MilliValue()) / float64(unit.MilliValue())))
	if used <= 0 {
		return nil
	}

	namespace := "ns-" + strings.SplitN(bucket, "-", 2)[0]
	ro := resources.Monitor{
		Category: namespace,
		Name:     bucket,
		Used:     map[uint8]int64{r.Properties.StringMap[resources.ResourceNetwork].Enum: used},
		Time:     endTime.Add(-1 * time.Minute),
		Type:     resources.AppType[resources.ObjectStorage],
	}
	r.Logger.Info("object storage traffic used", "monitor", ro)
	err = r.DBClient.InsertMonitor(context.Background(), &ro)
	if err != nil {
		return fmt.Errorf("failed to insert monitor: %w", err)
	}
	return nil
}

func (r *MonitorReconciler) monitorPodTrafficUsed(startTime, endTime time.Time) error {
	monitors, err := r.DBClient.GetDistinctMonitorCombinations(startTime, endTime)
	if err != nil {
		return fmt.Errorf("failed to get distinct monitor combinations: %w", err)
	}
	r.Logger.Info("distinct monitor combinations", "monitors len", len(monitors))
	wg, _ := errgroup.WithContext(context.Background())
	wg.SetLimit(100)
	for i := range monitors {
		monitor := monitors[i]
		wg.Go(func() error {
			return r.handlerTrafficUsed(startTime, endTime, monitor)
		})
	}
	return wg.Wait()
}

func (r *MonitorReconciler) handlerTrafficUsed(startTime, endTime time.Time, monitor resources.Monitor) error {
	bytes, err := r.TrafficClient.GetTrafficSentBytes(startTime, endTime, monitor.Category, monitor.Type, monitor.Name)
	if err != nil {
		return fmt.Errorf("failed to get traffic sent bytes: %w", err)
	}
	unit := r.Properties.StringMap[resources.ResourceNetwork].Unit
	used := int64(math.Ceil(float64(resource.NewQuantity(bytes, resource.BinarySI).MilliValue()) / float64(unit.MilliValue())))
	if used == 0 {
		return nil
	}
	//logger.Info("traffic used ", "monitor", monitor, "used", used, "unit", unit, "bytes", bytes)
	ro := resources.Monitor{
		Category: monitor.Category,
		Name:     monitor.Name,
		Used:     map[uint8]int64{r.Properties.StringMap[resources.ResourceNetwork].Enum: used},
		Time:     endTime.Add(-1 * time.Minute),
		Type:     monitor.Type,
	}
	r.Logger.Info("monitor traffic used", "monitor", ro)
	err = r.DBClient.InsertMonitor(context.Background(), &ro)
	if err != nil {
		return fmt.Errorf("failed to insert monitor: %w", err)
	}
	return nil
}

func (r *MonitorReconciler) getGPUResourceUsage(pod *corev1.Pod, gpuReq resource.Quantity, rs map[corev1.ResourceName]*quantity) (err error) {
	nodeName := pod.Spec.NodeName
	r.gpuMutex.Lock()
	defer r.gpuMutex.Unlock()
	gpuModel, exist := r.NvidiaGpu[nodeName]
	if !exist {
		if r.NvidiaGpu, err = gpu.GetNodeGpuModel(r.Client); err != nil {
			return fmt.Errorf("get node gpu model failed: %w", err)
		}
		if gpuModel, exist = r.NvidiaGpu[nodeName]; !exist {
			return fmt.Errorf("node %s not found gpu model", nodeName)
		}
	}
	if _, ok := rs[resources.NewGpuResource(gpuModel.GpuInfo.GpuProduct)]; !ok {
		rs[resources.NewGpuResource(gpuModel.GpuInfo.GpuProduct)] = initGpuResources()
	}
	logger.Info("gpu request", "pod", pod.Name, "namespace", pod.Namespace, "gpu req", gpuReq.String(), "node", nodeName, "gpu model", gpuModel.GpuInfo.GpuProduct)
	rs[resources.NewGpuResource(gpuModel.GpuInfo.GpuProduct)].Add(gpuReq)
	return nil
}

func initResources() (rs map[corev1.ResourceName]*quantity) {
	rs = make(map[corev1.ResourceName]*quantity)
	rs[resources.ResourceGPU] = initGpuResources()
	rs[corev1.ResourceCPU] = &quantity{Quantity: resource.NewQuantity(0, resource.DecimalSI), detail: ""}
	rs[corev1.ResourceMemory] = &quantity{Quantity: resource.NewQuantity(0, resource.BinarySI), detail: ""}
	rs[corev1.ResourceStorage] = &quantity{Quantity: resource.NewQuantity(0, resource.BinarySI), detail: ""}
	rs[resources.ResourceNetwork] = &quantity{Quantity: resource.NewQuantity(0, resource.BinarySI), detail: ""}
	rs[corev1.ResourceServicesNodePorts] = &quantity{Quantity: resource.NewQuantity(0, resource.DecimalSI), detail: ""}
	return
}

func initGpuResources() *quantity {
	return &quantity{Quantity: resource.NewQuantity(0, resource.DecimalSI), detail: ""}
}

func (r *MonitorReconciler) DropMonitorCollectionOlder() error {
	return r.DBClient.DropMonitorCollectionsOlderThan(30)
}
