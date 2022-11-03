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
	"os"
	"time"

	v1 "k8s.io/api/core/v1"

	"github.com/go-logr/logr"
	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

// PodResourcePriceReconciler reconciles a PodResourcePriceReconciler object
type PodResourcePriceReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	logr.Logger
}

const (
	PodResourcePricePrefix = "sealos-pod-controller"
)

//+kubebuilder:rbac:groups=metering.sealos.io,resources=podresourceprices,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=metering.sealos.io,resources=podresourceprices/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=metering.sealos.io,resources=podresourceprices/finalizers,verbs=update
//+kubebuilder:rbac:groups=core,resources=pods,verbs=get;list;watch;create;update;patch;delete

func (r *PodResourcePriceReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger = log.FromContext(ctx)

	podController := &meteringv1.PodResourcePrice{}
	err := r.Get(ctx, req.NamespacedName, podController)
	if err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	err = r.CreateOrUpdateExtensionResourcesPrice(ctx, podController)
	if err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if podController.Spec.Interval == 0 {
		podController.Spec.Interval = 60
	}

	if time.Now().Unix()-podController.Status.LatestUpdateTime >= int64(time.Minute.Minutes())*int64(podController.Spec.Interval) {
		err := r.UpdateResourceUsed(ctx, podController)
		if err != nil {
			return ctrl.Result{}, client.IgnoreNotFound(err)
		}
	}
	return ctrl.Result{Requeue: true, RequeueAfter: time.Duration(podController.Spec.Interval) * time.Minute}, nil
}

// CreateOrUpdateExtensionResourcesPrice need to create a ExtensionResourcesPrice to make metering-quota know this resource
func (r *PodResourcePriceReconciler) CreateOrUpdateExtensionResourcesPrice(ctx context.Context, obj client.Object) error {
	podController := obj.(*meteringv1.PodResourcePrice)
	extensionResourcesPrice := &meteringv1.ExtensionResourcesPrice{
		ObjectMeta: metav1.ObjectMeta{
			Namespace: os.Getenv(METERINGNAMESPACE),
			Name:      podController.Name,
		},
		Spec: meteringv1.ExtensionResourcesPriceSpec{
			Resources: make(map[v1.ResourceName]meteringv1.ResourcePrice, 0),
		},
	}

	//r.Logger.Info("podController.Spec.Resources", "podController name", podController.Name, "podController Resources", podController.Spec.Resources)
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, extensionResourcesPrice, func() error {
		extensionResourcesPrice.Spec.Resources = podController.Spec.Resources
		extensionResourcesPrice.Spec.Owner = podController.Spec.Owner
		err := controllerutil.SetOwnerReference(podController, extensionResourcesPrice, r.Scheme)
		if err != nil {
			return err
		}
		return nil
	}); err != nil {
		return fmt.Errorf("sync resource quota failed: %v", err)
	}
	r.Logger.V(1).Info("sync extensionResourcesPrice", "extensionResourcesPrice.Spec", extensionResourcesPrice.Spec)
	return nil
}

func (r *PodResourcePriceReconciler) UpdateResourceUsed(ctx context.Context, obj client.Object) error {
	podController := obj.(*meteringv1.PodResourcePrice)
	var podList v1.PodList
	err := r.List(ctx, &podList)
	if err != nil {
		return err
	}
	meteringQuotaMap := make(map[string]meteringv1.MeteringQuota, 0)
	meteringQuotaList := meteringv1.MeteringQuotaList{}
	err = r.List(ctx, &meteringQuotaList)
	if err != nil {
		return err
	}
	for _, meteringQuota := range meteringQuotaList.Items {
		meteringQuotaMap[meteringQuota.Namespace] = meteringQuota
	}
	for _, pod := range podList.Items {
		podNS := pod.Namespace
		if _, ok := meteringQuotaMap[podNS]; ok && pod.Status.Phase == v1.PodRunning {
			for _, container := range pod.Spec.Containers {
				if container.Resources.Limits != nil {
					for resourceName := range podController.Spec.Resources {
						if _, ok := container.Resources.Limits[resourceName]; ok {
							if _, ok2 := meteringQuotaMap[podNS].Status.Resources[resourceName]; ok2 {
								meteringQuotaMap[podNS].Status.Resources[resourceName].Used.Add(container.Resources.Limits[resourceName])
							} else {
								r.Logger.Info("container.Resources.Limits resource not available", "pod", pod.Name, "resource name", resourceName, "pod namespace", pod.Namespace)
							}
						} else {
							r.Logger.Info("container.Resources.Limits resource not available", "pod", pod.Name, "resource name", resourceName, "pod namespace", pod.Namespace)
						}
					}
				} else {
					r.Logger.Error(nil, "container.Resources.Limits is nil", "container", container.Name, "pod", pod.Name)
				}
			}
		}
	}

	for _, meteringQuota := range meteringQuotaMap {
		err := r.Status().Update(ctx, &meteringQuota)
		if err != nil {
			return err
		}
	}

	podController.Status.LatestUpdateTime = time.Now().Unix()
	err = r.Status().Update(ctx, podController)
	if err != nil {
		return err
	}
	//r.Logger.Info("sync meteringQuota success", "meteringQuota", meteringQuotaMap)
	r.Logger.Info("pod controller calculate resource success")
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *PodResourcePriceReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&meteringv1.PodResourcePrice{}).
		Complete(r)
}
