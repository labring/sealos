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
	"strconv"

	"github.com/go-logr/logr"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

type GpuReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	Logger logr.Logger
}

const (
	GPU                                  = "gpu"
	GPUInfo                              = "gpu-info"
	GPUInfoNameSpace                     = "sealos"
	NvidiaGPUProduct                     = "nvidia.com/gpu.product"
	NvidiaGPUMemory                      = "nvidia.com/gpu.memory"
	NvidiaGPU        corev1.ResourceName = "nvidia.com/gpu"
	GPUProduct                           = "gpu.product"
	GPUCount                             = "gpu.count"
	GPUMemory                            = "gpu.memory"
	NodeIndexKey                         = "node"
	PodIndexKey                          = "pod"
)

//+kubebuilder:rbac:groups=node.k8s.io,resources=gpus,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=node.k8s.io,resources=gpus/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=node.k8s.io,resources=gpus/finalizers,verbs=update
//+kubebuilder:rbac:groups="",resources=nodes,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups="",resources=nodes/status,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups="",resources=configmaps,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups="",resources=pods,verbs=get;list;watch;create;update;patch;delete

func (r *GpuReconciler) Reconcile(ctx context.Context, _ ctrl.Request) (ctrl.Result, error) {
	nodeList := &corev1.NodeList{}
	if err := r.List(ctx, nodeList, client.MatchingFields{NodeIndexKey: GPU}); err != nil {
		r.Logger.Error(err, "failed to get node list")
		return ctrl.Result{}, err
	}

	podList := &corev1.PodList{}
	if err := r.List(ctx, podList, client.MatchingFields{PodIndexKey: GPU}); err != nil {
		r.Logger.Error(err, "failed to get pod list")
		return ctrl.Result{}, err
	}

	/*
		"nodeMap": {
			"sealos-poc-gpu-master-0":{},
			"sealos-poc-gpu-node-1":{"gpu.count":"1","gpu.memory":"15360","gpu.product":"Tesla-T4"}}
		}
	*/
	nodeMap := make(map[string]map[string]string)
	var nodeName string
	// get the GPU product, GPU memory, GPU allocatable number on the node
	for _, node := range nodeList.Items {
		nodeName = node.Name
		if _, ok := nodeMap[nodeName]; !ok {
			nodeMap[nodeName] = make(map[string]string)
		}
		gpuProduct, ok1 := node.Labels[NvidiaGPUProduct]
		gpuMemory, ok2 := node.Labels[NvidiaGPUMemory]
		gpuCount, ok3 := node.Status.Allocatable[NvidiaGPU]
		if !ok1 || !ok2 || !ok3 {
			continue
		}
		nodeMap[nodeName][GPUProduct] = gpuProduct
		nodeMap[nodeName][GPUMemory] = gpuMemory
		nodeMap[nodeName][GPUCount] = gpuCount.String()
	}
	// get the number of GPU used by pods that are using GPU
	for _, pod := range podList.Items {
		nodeName = pod.Spec.NodeName
		_, ok1 := nodeMap[nodeName]
		gpuProduct, ok2 := pod.Spec.NodeSelector[NvidiaGPUProduct]
		if !ok1 || !ok2 {
			continue
		}
		phase := pod.Status.Phase
		if phase != corev1.PodRunning {
			continue
		}
		containers := pod.Spec.Containers
		for _, container := range containers {
			gpuCount, ok := container.Resources.Limits[NvidiaGPU]
			if !ok {
				continue
			}
			r.Logger.V(1).Info("pod using GPU", "name", pod.Name, "namespace", pod.Namespace, "gpuCount", gpuCount, "gpuProduct", gpuProduct)
			oldCount, err := strconv.ParseInt(nodeMap[nodeName][GPUCount], 10, 64)
			if err != nil {
				r.Logger.Error(err, "failed to parse gpu.count string to int64")
				return ctrl.Result{}, err
			}
			newCount := oldCount - gpuCount.Value()
			nodeMap[nodeName][GPUCount] = strconv.FormatInt(newCount, 10)
		}
	}

	// marshal node map to JSON string
	nodeMapBytes, err := json.Marshal(nodeMap)
	if err != nil {
		r.Logger.Error(err, "failed to marshal node map to JSON string")
		return ctrl.Result{}, err
	}
	nodeMapStr := string(nodeMapBytes)

	// create or update gpu-info configmap
	configmap := &corev1.ConfigMap{}
	err = r.Get(ctx, types.NamespacedName{Name: GPUInfo, Namespace: GPUInfoNameSpace}, configmap)
	if errors.IsNotFound(err) {
		configmap = &corev1.ConfigMap{
			ObjectMeta: metaV1.ObjectMeta{
				Name:      GPUInfo,
				Namespace: GPUInfoNameSpace,
			},
			Data: map[string]string{
				GPU: nodeMapStr,
			},
		}
		if err := r.Create(ctx, configmap); err != nil {
			r.Logger.Error(err, "failed to create gpu-info configmap")
			return ctrl.Result{}, err
		}
	} else if err == nil {
		if configmap.Data[GPU] != nodeMapStr {
			configmap.Data[GPU] = nodeMapStr
			if err := r.Update(ctx, configmap); err != nil && !errors.IsConflict(err) {
				r.Logger.Error(err, "failed to update gpu-info configmap")
				return ctrl.Result{}, err
			}
		}
	} else {
		r.Logger.Error(err, "failed to get gpu-info configmap")
		return ctrl.Result{}, err
	}
	r.Logger.V(1).Info("gpu-info configmap status", "gpu", configmap.Data[GPU])
	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *GpuReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.Logger = ctrl.Log.WithName("gpu-controller")
	r.Logger.V(1).Info("starting gpu controller")

	// build index for node which have GPU
	if err := mgr.GetFieldIndexer().IndexField(context.Background(), &corev1.Node{}, NodeIndexKey, func(rawObj client.Object) []string {
		node := rawObj.(*corev1.Node)
		if _, ok := node.Labels[NvidiaGPUProduct]; !ok {
			return nil
		}
		return []string{GPU}
	}); err != nil {
		return err
	}
	// build index for pod which use GPU
	if err := mgr.GetFieldIndexer().IndexField(context.Background(), &corev1.Pod{}, PodIndexKey, func(rawObj client.Object) []string {
		pod := rawObj.(*corev1.Pod)
		if _, ok := pod.Spec.NodeSelector[NvidiaGPUProduct]; !ok {
			return nil
		}
		if pod.Status.Phase != corev1.PodRunning {
			return nil
		}
		return []string{GPU}
	}); err != nil {
		return err
	}

	return ctrl.NewControllerManagedBy(mgr).
		For(&corev1.Pod{}).
		WithEventFilter(
			predicate.Funcs{
				CreateFunc: func(event event.CreateEvent) bool {
					_, ok := event.Object.(*corev1.Pod).Spec.NodeSelector[NvidiaGPUProduct]
					return ok
				},
				UpdateFunc: func(event event.UpdateEvent) bool {
					_, ok := event.ObjectNew.(*corev1.Pod).Spec.NodeSelector[NvidiaGPUProduct]
					if !ok {
						return false
					}
					phaseOld := event.ObjectOld.(*corev1.Pod).Status.Phase
					phaseNew := event.ObjectNew.(*corev1.Pod).Status.Phase
					return phaseOld != phaseNew
				},
				DeleteFunc: func(event event.DeleteEvent) bool {
					_, ok := event.Object.(*corev1.Pod).Spec.NodeSelector[NvidiaGPUProduct]
					return ok
				},
			},
		).
		Complete(r)
}
