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

	sealos_networkmanager "github.com/dinoallo/sealos-networkmanager/server/proto"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	"github.com/go-logr/logr"
	"golang.org/x/sync/semaphore"

	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/gpu"
	"github.com/labring/sealos/controllers/pkg/resources"
	"github.com/labring/sealos/controllers/pkg/utils/logger"
	"github.com/labring/sealos/controllers/pkg/utils/retry"

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
	stopCh            chan struct{}
	wg                sync.WaitGroup
	periodicReconcile time.Duration
	NvidiaGpu         map[string]gpu.NvidiaGPU
	DBClient          database.Interface
	Properties        *resources.PropertyTypeLS
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

var namespaceMonitorFuncs = make(map[string]func(ctx context.Context, namespace *corev1.Namespace) error)

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
	}
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
			//namespaceMonitorFuncs[namespaceResourceInfra] = r.infraResourceUsage
		}
	}
}

func (r *MonitorReconciler) StartReconciler(ctx context.Context) error {
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
			if err := r.processNamespace(ctx, namespace); err != nil {
				r.Logger.Error(err, "failed to process namespace", "namespace", namespace.Name)
			}
		}(&namespaceList.Items[i])
	}
	wg.Wait()
	logger.Info("end processNamespaceList", "time", time.Now().Format("2006-01-02 15:04:05"))
	return nil
}

func (r *MonitorReconciler) processNamespace(ctx context.Context, namespace *corev1.Namespace) error {
	//for res := range namespaceMonitorFuncs {
	//	if err := namespaceMonitorFuncs[res](ctx, dbClient, namespace); err != nil {
	//		r.Logger.Error(err, "monitor namespace resource", "resource", res, "namespace", namespace.Name)
	//		return err
	//	}
	//}
	if err := r.podResourceUsage(ctx, namespace); err != nil {
		r.Logger.Error(err, "monitor pod resource", "namespace", namespace.Name)
		return err
	}

	return nil
}

func (r *MonitorReconciler) podResourceUsage(ctx context.Context, namespace *corev1.Namespace) error {
	timeStamp := time.Now().UTC()
	podList := corev1.PodList{}
	podsRes := map[string]map[corev1.ResourceName]*quantity{}
	resourceMap := make(map[string]*resources.ResourceNamed)
	//logger.Info("start podResourceUsage", "namespace", namespace.Name, "time", timeStamp.Format("2006-01-02 15:04:05.000"))
	if err := r.List(context.Background(), &podList, &client.ListOptions{Namespace: namespace.Name}); err != nil {
		return err
	}
	for _, pod := range podList.Items {
		//TODO if pod is job && 结束时候到现在时间小于1分钟 统计资源
		if pod.Status.Phase == corev1.PodSucceeded || pod.Spec.NodeName == "" {
			continue
		}
		podResNamed := resources.NewResourceNamed(&pod)
		resourceMap[podResNamed.String()] = podResNamed
		if podsRes[podResNamed.String()] == nil {
			podsRes[podResNamed.String()] = initResources()
		}
		for _, container := range pod.Spec.Containers {
			// gpu only use limit and not ignore pod pending status
			if gpuRequest, ok := container.Resources.Limits[gpu.NvidiaGpuKey]; ok {
				err := r.getGPUResourceUsage(pod, gpuRequest, podsRes[podResNamed.String()])
				if err != nil {
					r.Logger.Error(err, "get gpu resource usage failed", "pod", pod.Name)
				}
			}
			if pod.Status.Phase != corev1.PodRunning {
				continue
			}
			if cpuRequest, ok := container.Resources.Limits[corev1.ResourceCPU]; ok {
				podsRes[podResNamed.String()][corev1.ResourceCPU].Add(cpuRequest)
			} else {
				podsRes[podResNamed.String()][corev1.ResourceCPU].Add(container.Resources.Requests[corev1.ResourceCPU])
			}
			if memoryRequest, ok := container.Resources.Limits[corev1.ResourceMemory]; ok {
				podsRes[podResNamed.String()][corev1.ResourceMemory].Add(memoryRequest)
			} else {
				podsRes[podResNamed.String()][corev1.ResourceMemory].Add(container.Resources.Requests[corev1.ResourceMemory])
			}
		}
	}

	//logger.Info("mid", "namespace", namespace.Name, "time", timeStamp.Format("2006-01-02 15:04:05"), "resourceMap", resourceMap, "podsRes", podsRes)

	pvcList := corev1.PersistentVolumeClaimList{}
	if err := r.List(context.Background(), &pvcList, &client.ListOptions{Namespace: namespace.Name}); err != nil {
		return err
	}
	for _, pvc := range pvcList.Items {
		if pvc.Status.Phase != corev1.ClaimBound {
			continue
		}
		pvcRes := resources.NewResourceNamed(&pvc)
		if podsRes[pvcRes.String()] == nil {
			resourceMap[pvcRes.String()] = pvcRes
			podsRes[pvcRes.String()] = initResources()
		}
		podsRes[pvcRes.String()][corev1.ResourceStorage].Add(pvc.Spec.Resources.Requests[corev1.ResourceStorage])
	}
	var monitors []*resources.Monitor

	getResourceUsed := func(podResource map[corev1.ResourceName]*quantity) (bool, map[uint8]int64) {
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
	for name, podResource := range podsRes {
		isEmpty, used := getResourceUsed(podResource)
		if isEmpty {
			continue
		}
		monitors = append(monitors, &resources.Monitor{
			Category: namespace.Name,
			Used:     used,
			Time:     timeStamp,
			Type:     resourceMap[name].Type(),
			Name:     resourceMap[name].Name(),
		})
	}
	return r.DBClient.InsertMonitor(ctx, monitors...)
}

func (r *MonitorReconciler) getPodTrafficUsed(namespace string, resourceMap map[string]*resources.ResourceNamed, podsRes map[string]map[corev1.ResourceName]*quantity) error {
	conn, err := grpc.Dial("xxx:xxx", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return fmt.Errorf("dial grpc failed: %w", err)
	}
	defer conn.Close()

	infoSvc := sealos_networkmanager.NewInfoServiceClient(conn)
	/*
		message TrafficStatRequest {
		  string namespace = 1;
		  TrafficType type = 2;
		  uint32 identity = 3;
		  optional FilterLabelOpType filter_label_op_type = 4;
		  map<string, string> filter_labels = 5;
		}
	*/
	cli, err := infoSvc.GetTrafficStat(context.Background(), &sealos_networkmanager.TrafficStatRequest{
		Namespace: namespace,
		Type:      sealos_networkmanager.TrafficType_IPv4Egress,
		// 2 && 7
		Identity:     2,
		FilterLabels: make(map[string]string),
	})
	if err != nil {
		return fmt.Errorf("get traffic stat failed: %w", err)
	}
	/*
		message TrafficStatResponse {
		  optional string namespace = 1;
		  optional string pod = 2;
		  optional uint64 bytes = 3;
		  optional google.protobuf.Timestamp lastSync = 4;
		  Status status = 5;
		}
	*/
	rsp, err := cli.Recv()
	if err != nil {
		return fmt.Errorf("recv traffic stat failed: %w", err)
	}
	//rsp.Bytes

	return nil
}

func (r *MonitorReconciler) getGPUResourceUsage(pod corev1.Pod, gpuReq resource.Quantity, rs map[corev1.ResourceName]*quantity) (err error) {
	nodeName := pod.Spec.NodeName
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
	return
}

func initGpuResources() *quantity {
	return &quantity{Quantity: resource.NewQuantity(0, resource.DecimalSI), detail: ""}
}
