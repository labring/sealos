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
	"encoding/json"
	"os"
	"reflect"
	"strconv"

	"github.com/go-logr/logr"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/selection"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

type GpuReconciler struct {
	client.Client
	APIReader      client.Reader
	Scheme         *runtime.Scheme
	Logger         logr.Logger
	aliasNamespace string
	aliasName      string
}

const (
	GPU                                  = "gpu"
	GPUInfo                              = "node-gpu-info"
	GPUInfoNameSpace                     = "node-system"
	NvidiaGPUProduct                     = "nvidia.com/gpu.product"
	NvidiaGPUMemory                      = "nvidia.com/gpu.memory"
	NvidiaGPU        corev1.ResourceName = "nvidia.com/gpu"
	GPUProduct                           = "gpu.product"
	GPUCount                             = "gpu.count"
	GPUMemory                            = "gpu.memory"
	GPUUse                               = "gpu.used"
	GPUDevbox                            = "gpu.devbox"
	GPUAvailable                         = "gpu.available"
	GPUAlias                             = "alias"
	podNodeNameField                     = "spec.nodeName"
	devboxLabel                          = "devbox.sealos.io/node"
)

//+kubebuilder:rbac:groups=node.k8s.io,resources=gpus,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=node.k8s.io,resources=gpus/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=node.k8s.io,resources=gpus/finalizers,verbs=update
//+kubebuilder:rbac:groups="",resources=nodes,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups="",resources=nodes/status,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups="",resources=configmaps,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups="",resources=pods,verbs=get;list;watch;create;update;patch;delete

func (r *GpuReconciler) Reconcile(ctx context.Context, _ ctrl.Request) (ctrl.Result, error) {
	return r.applyGPUInfoCM(ctx, r.Client)
}

func (r *GpuReconciler) fetchPodsByNode(
	ctx context.Context,
	reader client.Reader,
	nodeName string,
) []corev1.Pod {
	var pods corev1.PodList
	if err := reader.List(ctx, &pods, client.MatchingFields{podNodeNameField: nodeName}); err != nil {
		r.Logger.Error(err, "list pods error from cache", podNodeNameField, nodeName)
	}

	return pods.Items
}

func gpuRequestValue(container corev1.Container) int64 {
	if qty, ok := container.Resources.Requests[NvidiaGPU]; ok && qty.Sign() > 0 {
		return qty.Value()
	}
	if qty, ok := container.Resources.Limits[NvidiaGPU]; ok && qty.Sign() > 0 {
		return qty.Value()
	}
	return 0
}

func (r *GpuReconciler) QueryGPUAllocation(
	ctx context.Context,
	reader client.Reader,
	node *corev1.Node,
	gpuType string,
) int64 {
	if node == nil || node.Name == "" {
		return 0
	}
	if node.Labels[NvidiaGPUProduct] != gpuType {
		return 0
	}

	pods := r.fetchPodsByNode(ctx, reader, node.Name)
	var count int64
	for _, pod := range pods {
		// Count pods that are still running or terminating (GPU is occupied until exit).
		if pod.Status.Phase == corev1.PodSucceeded || pod.Status.Phase == corev1.PodFailed {
			continue
		}
		if selectorVal, ok := pod.Spec.NodeSelector[NvidiaGPUProduct]; ok &&
			selectorVal != gpuType {
			continue
		}
		if pod.Spec.NodeName != node.Name {
			continue
		}
		if pod.Status.PodIP == "" {
			continue
		}
		for _, container := range pod.Spec.Containers {
			count += gpuRequestValue(container)
		}
	}
	return count
}

func (r *GpuReconciler) applyGPUInfoCM(
	ctx context.Context,
	reader client.Reader,
) (ctrl.Result, error) {
	/*
		"nodeMap": {
			"sealos-poc-gpu-master-0":{},
			"sealos-poc-gpu-node-1":{"gpu.count":"1","gpu.memory":"15360","gpu.product":"Tesla-T4"}}
		}
	*/
	req1, err := labels.NewRequirement(NvidiaGPUProduct, selection.Exists, []string{})
	if err != nil {
		return ctrl.Result{}, err
	}
	req2, err := labels.NewRequirement(NvidiaGPUMemory, selection.Exists, []string{})
	if err != nil {
		return ctrl.Result{}, err
	}
	selector := labels.NewSelector().Add(*req1, *req2)

	nodeList := &corev1.NodeList{}
	err = reader.List(ctx, nodeList, &client.ListOptions{
		LabelSelector: selector,
	})
	if err != nil {
		return ctrl.Result{}, err
	}

	nodeMap := make(map[string]map[string]string, len(nodeList.Items))
	aliasMap := make(map[string]string)
	// get the GPU product, GPU memory, GPU allocatable number on the node
	for i := range nodeList.Items {
		node := &nodeList.Items[i]
		nodeName := node.Name
		if _, ok := nodeMap[nodeName]; !ok {
			nodeMap[nodeName] = make(map[string]string)
		}
		gpuProduct, ok1 := node.Labels[NvidiaGPUProduct]
		gpuMemory, ok2 := node.Labels[NvidiaGPUMemory]
		gpuCount, ok3 := node.Status.Allocatable[NvidiaGPU]
		if !ok1 || !ok2 || !ok3 {
			continue
		}
		aliasMap[gpuProduct] = gpuProduct
		nodeMap[nodeName][GPUProduct] = gpuProduct
		nodeMap[nodeName][GPUMemory] = gpuMemory
		nodeMap[nodeName][GPUCount] = gpuCount.String()
		used := r.QueryGPUAllocation(ctx, reader, node, gpuProduct)
		nodeMap[nodeName][GPUDevbox] = "false"
		if _, ok := node.Labels[devboxLabel]; ok {
			nodeMap[nodeName][GPUDevbox] = "true"
		}
		nodeMap[nodeName][GPUUse] = strconv.FormatInt(used, 10)
		available := gpuCount.Value() - used
		if available < 0 {
			available = 0
		}
		nodeMap[nodeName][GPUAvailable] = strconv.FormatInt(available, 10)
	}

	aliasConfigmap := &corev1.ConfigMap{}
	err = reader.Get(
		ctx,
		types.NamespacedName{Name: r.aliasName, Namespace: r.aliasNamespace},
		aliasConfigmap,
	)
	if err == nil {
		if aliasConfigmap.Data == nil {
			aliasConfigmap.Data = map[string]string{}
		}
		for k, v := range aliasMap {
			if _, ok := aliasConfigmap.Data[k]; !ok {
				continue
			}
			if aliasConfigmap.Data[k] != v {
				aliasMap[k] = aliasConfigmap.Data[k]
			}
		}
	}
	aliasMapBytes, err := json.Marshal(aliasMap)
	if err != nil {
		r.Logger.Error(err, "failed to marshal alias map to JSON string")
		return ctrl.Result{}, err
	}
	aliasMapStr := string(aliasMapBytes)
	// marshal node map to JSON string
	nodeMapBytes, err := json.Marshal(nodeMap)
	if err != nil {
		r.Logger.Error(err, "failed to marshal node map to JSON string")
		return ctrl.Result{}, err
	}
	nodeMapStr := string(nodeMapBytes)

	// create or update gpu-info configmap
	configmap := &corev1.ConfigMap{}
	err = reader.Get(
		ctx,
		types.NamespacedName{Name: GPUInfo, Namespace: GPUInfoNameSpace},
		configmap,
	)

	if errors.IsNotFound(err) {
		configmap = &corev1.ConfigMap{
			ObjectMeta: metaV1.ObjectMeta{
				Name:      GPUInfo,
				Namespace: GPUInfoNameSpace,
			},
			Data: map[string]string{
				GPU:      nodeMapStr,
				GPUAlias: aliasMapStr,
			},
		}
		if err := r.Create(ctx, configmap); err != nil {
			r.Logger.Error(err, "failed to create gpu-info configmap")
			return ctrl.Result{}, err
		}
	} else if err != nil {
		r.Logger.Error(err, "failed to get gpu-info configmap")
		return ctrl.Result{}, err
	}

	if configmap.Data == nil {
		configmap.Data = map[string]string{}
	}
	if configmap.Data[GPU] != nodeMapStr {
		configmap.Data[GPU] = nodeMapStr
		if err := r.Update(ctx, configmap); err != nil && !errors.IsConflict(err) {
			r.Logger.Error(err, "failed to update gpu-info configmap")
			return ctrl.Result{}, err
		}
	}
	if configmap.Data[GPUAlias] != aliasMapStr {
		configmap.Data[GPUAlias] = aliasMapStr
		if err := r.Update(ctx, configmap); err != nil && !errors.IsConflict(err) {
			r.Logger.Error(err, "failed to update gpu-info configmap")
			return ctrl.Result{}, err
		}
	}

	r.Logger.V(1).Info("gpu-info configmap status", "gpu", configmap.Data[GPU])
	return ctrl.Result{}, nil
}

func (r *GpuReconciler) initGPUInfoCM(ctx context.Context) error {
	reader := r.APIReader
	if reader == nil {
		reader = r.Client
	}
	// filter for nodes that have GPU
	_, err := r.applyGPUInfoCM(ctx, reader)
	return err
}

// SetupWithManager sets up the controller with the Manager.
func (r *GpuReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.Logger = ctrl.Log.WithName("gpu-controller")
	r.Logger.V(1).Info("starting gpu controller")
	r.APIReader = mgr.GetAPIReader()
	r.Client = mgr.GetClient()

	{
		pod := &corev1.Pod{}
		podsFunc := func(obj client.Object) []string {
			podObj, ok := obj.(*corev1.Pod)
			if !ok {
				return nil
			}
			nodeName := podObj.Spec.NodeName
			if nodeName == "" {
				return nil
			}
			return []string{nodeName}
		}

		if err := mgr.GetFieldIndexer().IndexField(context.Background(), pod, podNodeNameField, podsFunc); err != nil {
			return err
		}
	}

	r.aliasName = os.Getenv("ALIAS_NAME")
	r.aliasNamespace = os.Getenv("ALIAS_NAMESPACE")
	if r.aliasName == "" {
		r.aliasName = "gpu-alias"
	}
	if r.aliasNamespace == "" {
		r.aliasNamespace = "kube-system"
	}

	// init node-gpu-info configmap
	r.Logger.V(1).Info("initializing node-gpu-info configmap")
	if err := r.initGPUInfoCM(context.Background()); err != nil {
		return err
	}
	return ctrl.NewControllerManagedBy(mgr).
		For(&corev1.Pod{}, builder.WithPredicates(predicate.Funcs{
			CreateFunc: func(event event.CreateEvent) bool {
				return useGPU(event.Object)
			},
			UpdateFunc: func(event event.UpdateEvent) bool {
				podOld, ok := event.ObjectOld.(*corev1.Pod)
				if !ok {
					return false
				}
				podNew, ok := event.ObjectNew.(*corev1.Pod)
				if !ok {
					return false
				}
				if !useGPU(podNew) {
					return false
				}
				phaseOld := podOld.Status.Phase
				phaseNew := podNew.Status.Phase
				ipOld := podOld.Status.PodIP
				ipNew := podNew.Status.PodIP
				nodeOld := podOld.Spec.NodeName
				nodeNew := podNew.Spec.NodeName
				return phaseOld != phaseNew || ipOld != ipNew || nodeOld != nodeNew
			},
			DeleteFunc: func(event event.DeleteEvent) bool {
				return useGPU(event.Object)
			},
		})).
		Watches(&corev1.Node{}, &handler.EnqueueRequestForObject{}, builder.WithPredicates(predicate.Funcs{
			CreateFunc: func(event event.CreateEvent) bool {
				return hasGPU(event.Object)
			},
			UpdateFunc: func(event event.UpdateEvent) bool {
				oldNode, ok := event.ObjectOld.(*corev1.Node)
				if !ok {
					return false
				}
				newNode, ok := event.ObjectNew.(*corev1.Node)
				if !ok {
					return false
				}
				return gpuChanged(oldNode, newNode)
			},
			DeleteFunc: func(event event.DeleteEvent) bool {
				return hasGPU(event.Object)
			},
		})).
		Watches(&corev1.ConfigMap{}, &handler.EnqueueRequestForObject{}, builder.WithPredicates(predicate.Funcs{
			CreateFunc: func(event event.CreateEvent) bool {
				return isGPUInfoConfigMap(event.Object)
			},
			UpdateFunc: func(event event.UpdateEvent) bool {
				return isGPUInfoConfigMap(event.ObjectNew) &&
					configMapChanged(event.ObjectOld, event.ObjectNew)
			},
			DeleteFunc: func(event event.DeleteEvent) bool {
				return isGPUInfoConfigMap(event.Object)
			},
		})).
		Complete(r)
}

func gpuChanged(oldNode, newNode *corev1.Node) bool {
	oldHasGPU := hasGPU(oldNode)
	newHasGPU := hasGPU(newNode)
	if oldHasGPU != newHasGPU {
		return true
	}

	if !oldHasGPU {
		return false
	}

	oldCount := oldNode.Status.Allocatable[NvidiaGPU]
	newCount := newNode.Status.Allocatable[NvidiaGPU]
	if oldCount.Cmp(newCount) != 0 {
		return true
	}

	if oldNode.Labels[devboxLabel] != newNode.Labels[devboxLabel] {
		return true
	}

	if oldNode.Labels[NvidiaGPUProduct] != newNode.Labels[NvidiaGPUProduct] {
		return true
	}

	return oldNode.Labels[NvidiaGPUMemory] != newNode.Labels[NvidiaGPUMemory]
}

func useGPU(obj client.Object) bool {
	pod, ok := obj.(*corev1.Pod)
	if !ok {
		return false
	}
	if _, ok := pod.Spec.NodeSelector[NvidiaGPUProduct]; ok {
		return true
	}
	if podRequestsGPUContainers(pod.Spec.Containers) {
		return true
	}
	return podRequestsGPUContainers(pod.Spec.InitContainers)
}

func hasGPU(obj client.Object) bool {
	node, ok := obj.(*corev1.Node)
	if !ok {
		return false
	}
	_, ok1 := node.Labels[NvidiaGPUMemory]
	_, ok2 := node.Labels[NvidiaGPUProduct]
	_, ok3 := node.Status.Allocatable[NvidiaGPU]
	return ok1 && ok2 && ok3
}

func podRequestsGPUContainers(containers []corev1.Container) bool {
	for _, container := range containers {
		if gpuRequestValue(container) > 0 {
			return true
		}
	}
	return false
}

func isGPUInfoConfigMap(obj client.Object) bool {
	cm, ok := obj.(*corev1.ConfigMap)
	if !ok || cm == nil {
		return false
	}
	return cm.Name == GPUInfo && cm.Namespace == GPUInfoNameSpace
}

func configMapChanged(oldObj, newObj client.Object) bool {
	oldCM, ok1 := oldObj.(*corev1.ConfigMap)
	newCM, ok2 := newObj.(*corev1.ConfigMap)
	if !ok1 || !ok2 || oldCM == nil || newCM == nil {
		return false
	}
	if !isGPUInfoConfigMap(newCM) {
		return false
	}
	return !reflect.DeepEqual(oldCM.Data, newCM.Data) ||
		!reflect.DeepEqual(oldCM.BinaryData, newCM.BinaryData)
}
