/*
Copyright 2022 labring.

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
	"fmt"
	"math"
	"time"

	meteringcommonv1 "github.com/labring/sealos/controllers/common/metering/api/v1"

	"k8s.io/apimachinery/pkg/api/resource"

	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	v1 "k8s.io/api/core/v1"

	"github.com/labring/sealos/controllers/infra/common"

	"golang.org/x/sync/errgroup"

	"github.com/go-logr/logr"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/util/retry"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	infrav1 "github.com/labring/sealos/controllers/infra/api/v1"

	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// InfraResourceReconciler reconciles a InfraResource object
type InfraResourceReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	logr.Logger
}

type InfraData struct {
	Flavor string
	Volume []VolumeData
	Count  int
}

type VolumeData struct {
	Capacity   int
	VolumeType string
}

//+kubebuilder:rbac:groups=infra.sealos.io,resources=infraresources,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=infra.sealos.io,resources=infraresources/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=infra.sealos.io,resources=infraresources/finalizers,verbs=update
//+kubebuilder:rbac:groups=metering.common.sealos.io,resources=resources,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=metering.common.sealos.io,resources=extensionresourceprices,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=namespaces,verbs=get;list;watch;create;update;patch;delete

func (r *InfraResourceReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	infraController := &infrav1.InfraResource{}
	err := r.Get(ctx, req.NamespacedName, infraController)
	if err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	// Register the resource to metering-quota
	err = r.CreateOrUpdateExtensionResourcesPrice(ctx, infraController)
	if err != nil {
		r.Logger.Error(err, "CreateOrUpdateExtensionResourcesPrice failed")
		return ctrl.Result{Requeue: true, RequeueAfter: time.Second}, client.IgnoreNotFound(err)
	}

	// update resource used every infraController.Spec.Interval Minutes
	if time.Now().Unix()-infraController.Status.LatestUpdateTime >= int64(time.Minute.Minutes())*int64(infraController.Spec.Interval) {
		if err := r.UpdateResourceUsed(ctx, infraController); err != nil {
			r.Logger.Error(err, "UpdateResourceUsed failed")
			return ctrl.Result{Requeue: true}, client.IgnoreNotFound(err)
		}
	}
	return ctrl.Result{Requeue: true, RequeueAfter: time.Duration(infraController.Spec.Interval) * time.Second}, nil
}

// CreateOrUpdateExtensionResourcesPrice need to create a ExtensionResourcesPrice to make metering-quota know this resource
func (r *InfraResourceReconciler) CreateOrUpdateExtensionResourcesPrice(ctx context.Context, obj client.Object) error {
	infraController := obj.(*infrav1.InfraResource)
	extensionResourcesPrice := &meteringcommonv1.ExtensionResourcePrice{
		ObjectMeta: metav1.ObjectMeta{
			Namespace: common.InfraSystemNamespace,
			Name:      meteringcommonv1.ExtensionResourcePricePrefix + infrav1.InfraResourcePricePrefix,
		},
	}
	r.Logger.Info("create or update extensionResourcePrice", "infraController name", infraController.Name, "infraController Resources", infraController.Spec.Resources)
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, extensionResourcesPrice, func() error {
		extensionResourcesPrice.Spec.Resources = infraController.Spec.Resources
		extensionResourcesPrice.Spec.ResourceName = infraController.Spec.ResourceName
		extensionResourcesPrice.Spec.GroupVersionKinds = infrav1.DefaultInfraResourceGVK
		return controllerutil.SetControllerReference(infraController, extensionResourcesPrice, r.Scheme)
	}); err != nil {
		return fmt.Errorf("sync ExtensionResourcesPrice failed: %v", err)
	}
	r.Logger.V(1).Info("sync extensionResourcesPrice", "extensionResourcesPrice.Spec", extensionResourcesPrice.Spec)
	return nil
}

// UpdateResourceUsed generate a resourceUsed per infra per interval
func (r *InfraResourceReconciler) UpdateResourceUsed(ctx context.Context, obj client.Object) error {
	infraController := obj.(*infrav1.InfraResource)
	var infraList infrav1.InfraList
	eg, _ := errgroup.WithContext(context.Background())

	// List all infras
	err := r.List(ctx, &infraList)
	if err != nil {
		return err
	}
	// sync resource used for each infra
	for i := range infraList.Items {
		infra := infraList.Items[i]
		// if infra is not running, skip it
		if !r.checkInfraStatusRunning(infra) {
			continue
		}
		eg.Go(func() error {
			// sync resource
			return r.syncInfraResource(ctx, infra, infraController)
		})

		if err := eg.Wait(); err != nil {
			return err
		}
	}
	// update infraController status
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		if err := r.Get(ctx, types.NamespacedName{Namespace: infraController.Namespace, Name: infraController.Name}, infraController); err != nil {
			return client.IgnoreNotFound(err)
		}
		infraController.Status.LatestUpdateTime = time.Now().Unix()
		infraController.Status.SeqID++
		return r.Status().Update(ctx, infraController)
	}); err != nil {
		r.Logger.Error(err, "UpdateResourceUsed failed")
		return fmt.Errorf("infra controller update err:%v", err)
	}
	r.Logger.Info("infra controller calculate resource success")
	return nil
}

// checkInfraStatus check infra status
func (r *InfraResourceReconciler) checkInfraStatusRunning(infra infrav1.Infra) bool {
	if infra.Status.Status == infrav1.Running.String() {
		return true
	}
	r.Logger.Info("infra status is not running", "infra name", infra.Name, "infra namespace", infra.Namespace, "infra status", infra.Status.Status)
	return false
}

// syncInfraResource sync resource used for each infra
func (r *InfraResourceReconciler) syncInfraResource(ctx context.Context, infra infrav1.Infra, infraController *infrav1.InfraResource) error {
	quantityMap := make(map[v1.ResourceName]int64)
	for _, host := range infra.Spec.Hosts {
		cnt := int64(host.Count)
		flavor := host.Flavor
		quantityMap[common.CPUResourceName] += common.CPUMap[flavor] * cnt
		quantityMap[common.MemoryResourceName] += common.MemoryMap[flavor] * cnt
		for _, disk := range host.Disks {
			quantityMap[common.VolumeResourceName] += int64(disk.Capacity)
		}
		quantityMap[common.VolumeResourceName] = quantityMap[common.VolumeResourceName] * int64(host.Count)
	}
	r.Logger.Info("infra resources", "cpu quantity", quantityMap[common.CPUResourceName], "memory quantity", quantityMap[common.MemoryResourceName], "volume quantity", quantityMap[common.VolumeResourceName])

	infraResource := meteringcommonv1.Resource{
		ObjectMeta: metav1.ObjectMeta{
			Name:      GetResourceName(&infra, infraController.Status.SeqID),
			Namespace: common.InfraSystemNamespace,
		},
	}
	infraData, err := r.syncInfraData(infra)
	if err != nil {
		return fmt.Errorf("sync infra data failed: %v", err)
	}
	infraResource.Annotations = map[string]string{
		common.InfraDataAnnotation: infraData,
	}
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, &infraResource, func() error {
		if infraResource.Spec.Resources == nil {
			infraResource.Spec.Resources = make(map[v1.ResourceName]meteringcommonv1.ResourceInfo)
		}
		for k, v := range infraController.Spec.Resources {
			var quantity *resource.Quantity
			var cost int64
			if k == common.CPUResourceName {
				quantity = resource.NewQuantity(quantityMap[k], resource.BinarySI)
				cost = int64(math.Ceil(float64(quantityMap[k]) * float64(v.Price) / 10))
			} else if k == common.MemoryResourceName {
				quantity = resource.NewQuantity(quantityMap[k]<<30, resource.BinarySI)
				cost = int64(math.Ceil(float64(quantityMap[k]) * float64(v.Price) / 10))
			} else {
				quantity = resource.NewQuantity(quantityMap[k]<<30, resource.BinarySI)
				cost = int64(math.Ceil(float64(quantityMap[k]) * float64(v.Price) / 100))
			}
			infraResource.Spec.Resources[k] = meteringcommonv1.ResourceInfo{
				Used:      quantity,
				Timestamp: time.Now().Unix(),
				Namespace: infra.Namespace,
				Cost:      cost,
			}
		}
		return nil
	}); err != nil {
		return err
	}

	return nil
}

func (r *InfraResourceReconciler) syncInfraData(infra infrav1.Infra) (string, error) {
	var infraData []InfraData
	var volumeData []VolumeData
	for _, host := range infra.Spec.Hosts {
		for _, disk := range host.Disks {
			volumeData = append(volumeData, VolumeData{
				Capacity:   disk.Capacity,
				VolumeType: disk.VolumeType,
			})
		}
		infraData = append(infraData, InfraData{
			Flavor: host.Flavor,
			Volume: volumeData,
			Count:  host.Count,
		})
	}
	infraDataStr, err := json.Marshal(infraData)
	if err != nil {
		return "", fmt.Errorf("marshal infra data err:%v", err)
	}
	return string(infraDataStr), nil
}

// GetResourceName get resource name
func GetResourceName(infra *infrav1.Infra, seqID int64) string {
	return fmt.Sprintf("%s-%s-%v", infra.Namespace, infra.Name, seqID)
}

// SetupWithManager sets up the controller with the Manager.
func (r *InfraResourceReconciler) SetupWithManager(mgr ctrl.Manager) error {
	const controllerName = "InfraResource-controller"
	r.Logger = ctrl.Log.WithName(controllerName)
	r.Logger.V(1).Info("reconcile InfraResource-controller")
	return ctrl.NewControllerManagedBy(mgr).
		For(&infrav1.InfraResource{}, builder.WithPredicates(
			predicate.Or(predicate.GenerationChangedPredicate{}))).
		Complete(r)
}
