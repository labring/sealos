/*
Copyright 2022.

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
	"k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/apimachinery/pkg/types"
	"os"
	"time"

	"k8s.io/client-go/util/retry"

	v1 "k8s.io/api/core/v1"

	"github.com/go-logr/logr"
	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

// PodResourcePriceReconciler reconciles a PodResourcePriceReconciler object
type PodResourcePriceReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	logr.Logger
	MeteringSystemNameSpace string
}

const (
	PodResourcePricePrefix = "sealos-pod-controller"
)

//+kubebuilder:rbac:groups=metering.sealos.io,resources=podresourceprices,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=metering.sealos.io,resources=podresourceprices/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=metering.sealos.io,resources=podresourceprices/finalizers,verbs=update
//+kubebuilder:rbac:groups=core,resources=pods,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=metering.sealos.io,resources=meteringquotas,verbs=get;list;watch;create;update;patch;delete

func (r *PodResourcePriceReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	podController := &meteringv1.PodResourcePrice{}
	err := r.Get(ctx, req.NamespacedName, podController)
	if err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	err = r.CreateOrUpdateExtensionResourcesPrice(ctx, podController)
	if err != nil {
		r.Logger.Error(err, "CreateOrUpdateExtensionResourcesPrice failed")
		return ctrl.Result{Requeue: true, RequeueAfter: time.Second}, client.IgnoreNotFound(err)
	}

	// update resource used every podController.Spec.Interval Minutes
	if time.Now().Unix()-podController.Status.LatestUpdateTime >= int64(time.Minute.Minutes())*int64(podController.Spec.Interval) {
		err := r.UpdateResourceUsed(ctx, podController)
		if err != nil {
			r.Logger.Error(err, "UpdateResourceUsed failed")
			return ctrl.Result{Requeue: true}, client.IgnoreNotFound(err)
		}
	}

	return ctrl.Result{Requeue: true, RequeueAfter: time.Duration(podController.Spec.Interval) * time.Minute}, nil
}

// CreateOrUpdateExtensionResourcesPrice need to create a ExtensionResourcesPrice to make metering-quota know this resource
func (r *PodResourcePriceReconciler) CreateOrUpdateExtensionResourcesPrice(ctx context.Context, obj client.Object) error {
	podController := obj.(*meteringv1.PodResourcePrice)
	extensionResourcesPrice := &meteringv1.ExtensionResourcesPrice{
		ObjectMeta: metav1.ObjectMeta{
			Namespace: r.MeteringSystemNameSpace,
			Name:      PodResourcePricePrefix,
		},
	}

	r.Logger.Info("create or update extensionResourcePrice", "podController name", podController.Name, "podController Resources", podController.Spec.Resources)
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, extensionResourcesPrice, func() error {
		extensionResourcesPrice.Spec.Resources = podController.Spec.Resources
		extensionResourcesPrice.Spec.ResourceName = podController.Spec.ResourceName
		//extensionResourcesPrice.SetPrice(apiVersion, kind, podController.Name)
		return controllerutil.SetControllerReference(podController, extensionResourcesPrice, r.Scheme)
	}); err != nil {
		return fmt.Errorf("sync ExtensionResourcesPrice failed: %v", err)
	}
	//r.Logger.V(1).Info("sync extensionResourcesPrice", "extensionResourcesPrice.Spec", extensionResourcesPrice.Spec)
	return nil
}

func (r *PodResourcePriceReconciler) UpdateResourceUsed(ctx context.Context, obj client.Object) error {
	podController := obj.(*meteringv1.PodResourcePrice)
	var podList v1.PodList
	err := r.List(ctx, &podList)
	if err != nil {
		return err
	}

	for _, pod := range podList.Items {
		podNS := pod.Namespace
		if !r.checkOutPodStatus(ctx, pod) {
			continue
		}
		for _, con := range pod.Spec.Containers {
			for resourceName := range podController.Spec.Resources {
				ok, resourceQuantity := r.checkResourceExist(resourceName, con)
				if !ok {
					continue
				}
				if err = r.syncMeteringQuota(ctx, podNS, resourceName, resourceQuantity); err != nil {
					r.Logger.Error(err, "syncMeteringQuota failed")
				}
			}
		}
		// storage resource not in pod container, so need to get it from resource quota
		resourceQuota := v1.ResourceQuota{}
		err := r.Get(ctx, client.ObjectKey{Name: ResourceQuotaPrefix + podNS, Namespace: podNS}, &resourceQuota)
		if err != nil {
			return err
		}
		//r.Logger.V(1).Info("resourceQuota", "resourceQuota", resourceQuota)
		storage := resourceQuota.Status.Used.Name("requests.storage", resource.BinarySI)
		if err = r.syncMeteringQuota(ctx, podNS, "storage", *storage); err != nil {
			r.Logger.Error(err, "syncMeteringQuota failed")
		}
	}

	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		err := r.Get(ctx, types.NamespacedName{Namespace: podController.Namespace, Name: podController.Name}, podController)
		if err != nil {
			return client.IgnoreNotFound(err)
		}
		podController.Status.LatestUpdateTime = time.Now().Unix()
		if err = r.Status().Update(ctx, podController); err != nil {
			return err
		}
		return nil
	}); err != nil {
		r.Logger.Error(err, "UpdateResourceUsed failed")
		return fmt.Errorf("pod controller update err:%v", err)
	}
	r.Logger.Info("pod controller calculate resource success")
	return nil
}

func (r *PodResourcePriceReconciler) checkOutPodStatus(ctx context.Context, pod v1.Pod) bool {
	meteringQuota := meteringv1.MeteringQuota{}
	err := r.Get(ctx, client.ObjectKey{Name: MeteringQuotaPrefix + pod.Namespace, Namespace: pod.Namespace}, &meteringQuota)
	if err != nil {
		r.Logger.V(1).Info("pod ns get meterungquota failed", "pod name", pod.Name, "pod ns", pod.Namespace, "err", err)
		return false
	}

	if pod.Status.Phase == v1.PodRunning {
		return true
	}

	r.Logger.Info("pod status is  not ready", "pod name", pod.Name, "pod namespace", pod.Namespace, "pod status", pod.Status.Phase)
	return false
}

func (r *PodResourcePriceReconciler) checkResourceExist(resourceName v1.ResourceName, container v1.Container) (bool, resource.Quantity) {
	//r.Logger.V(1).Info("pod container", "resourceName", resourceName, "container", container)
	if _, ok := container.Resources.Limits[resourceName]; ok {
		return ok, container.Resources.Limits[resourceName]
		//r.Logger.Info("container.Resources.Limits resource not available", "resource name", resourceName)
	} else if _, ok := container.Resources.Requests[resourceName]; ok {
		return ok, container.Resources.Requests[resourceName]
	}

	return false, resource.Quantity{}
}

func (r *PodResourcePriceReconciler) syncMeteringQuota(ctx context.Context, podNS string, resourceName v1.ResourceName, resourceQuantity resource.Quantity) error {
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		meteringQuota := &meteringv1.MeteringQuota{}
		err := r.Get(ctx, client.ObjectKey{Name: MeteringQuotaPrefix + podNS, Namespace: podNS}, meteringQuota)
		if err != nil {
			return err
		}

		if _, ok := meteringQuota.Spec.Resources[resourceName]; !ok {
			return fmt.Errorf("meteringQuota resource not available resource name: %v", resourceName)
		}

		_, err = controllerutil.CreateOrUpdate(ctx, r.Client, meteringQuota, func() error {
			meteringQuota.Spec.Resources[resourceName].Used.Add(resourceQuantity)
			return nil
		})

		r.Logger.V(1).Info("meteringQuota add resource used success", "pod ns", podNS, "resource name", resourceName, "resource quantity", resourceQuantity)
		return err
	}); err != nil {
		return err
	}

	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *PodResourcePriceReconciler) SetupWithManager(mgr ctrl.Manager) error {
	const controllerName = "pod-controller"
	r.Logger = ctrl.Log.WithName(controllerName)
	r.Logger.V(1).Info("reconcile controller pod-controller")
	r.MeteringSystemNameSpace = os.Getenv(METERINGNAMESPACEENV)
	if os.Getenv(METERINGNAMESPACEENV) == "" {
		r.MeteringSystemNameSpace = DEFAULTMETERINGNAMESPACE
	}
	return ctrl.NewControllerManagedBy(mgr).
		For(&meteringv1.PodResourcePrice{}).
		Complete(r)
}
