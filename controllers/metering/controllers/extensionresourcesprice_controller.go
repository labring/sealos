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
	"k8s.io/client-go/util/retry"
	"time"

	"k8s.io/apimachinery/pkg/api/resource"

	"github.com/go-logr/logr"
	v1 "k8s.io/api/core/v1"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// ExtensionResourcesPriceReconciler reconciles a ExtensionResourcesPrice object
type ExtensionResourcesPriceReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	logr.Logger
}

//+kubebuilder:rbac:groups=metering.sealos.io,resources=extensionresourcesprices,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=metering.sealos.io,resources=extensionresourcesprices/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=metering.sealos.io,resources=extensionresourcesprices/finalizers,verbs=update
//+kubebuilder:rbac:groups=core,resources=namespaces,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=metering.sealos.io,resources=meterings,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=metering.sealos.io,resources=meteringquotas,verbs=get;list;watch;create;update;patch;delete

func (r *ExtensionResourcesPriceReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger.Info("reconcile extension resources price")
	extensionResourcesPrice := meteringv1.ExtensionResourcesPrice{
		Spec: meteringv1.ExtensionResourcesPriceSpec{
			Resources: make(map[v1.ResourceName]meteringv1.ResourcePrice, 0),
		},
	}

	err := r.Get(ctx, req.NamespacedName, &extensionResourcesPrice)
	if err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	r.Logger.Info("sync metering quota", "name", extensionResourcesPrice.Name, "Spec", extensionResourcesPrice.Spec.Resources)
	if err := r.syncMeteringQuota(ctx, extensionResourcesPrice); err != nil {
		r.Logger.Error(err, "sync metering quota failed")
		return ctrl.Result{Requeue: true, RequeueAfter: time.Second}, err
	}
	r.Logger.Info("sync metering ")
	if err := r.syncMetering(ctx, extensionResourcesPrice); err != nil {
		r.Logger.Error(err, "sync metering failed")
		return ctrl.Result{Requeue: true, RequeueAfter: time.Second}, err
	}
	return ctrl.Result{}, nil
}

func (r *ExtensionResourcesPriceReconciler) syncMeteringQuota(ctx context.Context, extensionResourcesPrice meteringv1.ExtensionResourcesPrice) error {
	meteringQuotaList := &meteringv1.MeteringQuotaList{}
	err := r.List(ctx, meteringQuotaList)
	if err != nil {
		return err
	}

	for _, meteringQuota := range meteringQuotaList.Items {
		if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
			meteringQuotaNew := meteringv1.MeteringQuota{}
			err := r.Get(ctx, client.ObjectKey{Name: meteringQuota.Name, Namespace: meteringQuota.Namespace}, &meteringQuotaNew)
			if err != nil {
				return client.IgnoreNotFound(err)
			}

			if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, &meteringQuotaNew, func() error {
				if meteringQuotaNew.Spec.Resources == nil {
					meteringQuotaNew.Spec.Resources = make(map[v1.ResourceName]meteringv1.ResourceUsed, 0)
				}
				for resourceName, v := range ResourcePrice2MeteringQuota(extensionResourcesPrice.Spec.Resources) {
					//r.Logger.Info("metering quota", "resource", meteringQuota.Status.Resources, "v", v, "resource name", resourceName)
					meteringQuotaNew.Spec.Resources[resourceName] = v
				}
				return nil
			}); err != nil {
				return err
			}
			return nil
		}); err != nil {
			r.Logger.Error(err, "sync metering quota failed: %v")
			continue
		}

		//r.Logger.Info("metering quota", "metering quota", meteringQuota)
	}
	return nil
}

func ResourcePrice2MeteringQuota(resourcePrices map[v1.ResourceName]meteringv1.ResourcePrice) map[v1.ResourceName]meteringv1.ResourceUsed {
	resourceUsed := make(map[v1.ResourceName]meteringv1.ResourceUsed, 0)

	for resourceName := range resourcePrices {
		resourceUsed[resourceName] = meteringv1.ResourceUsed{
			Used: &resource.Quantity{},
		}
	}
	//log.Log.Info("ResourcePrice2MeteringQuota used", "resourceUsed", resourceUsed, "resourcePrices", resourcePrices)
	return resourceUsed
}

func (r *ExtensionResourcesPriceReconciler) syncMetering(ctx context.Context, extensionResourcesPrice meteringv1.ExtensionResourcesPrice) error {
	meteringList := &meteringv1.MeteringList{}
	err := r.List(ctx, meteringList)
	if err != nil {
		return err
	}
	for _, metering := range meteringList.Items {
		if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
			meteringNew := meteringv1.Metering{}
			err := r.Get(ctx, client.ObjectKey{Name: metering.Name, Namespace: metering.Namespace}, &meteringNew)
			if err != nil {
				return client.IgnoreNotFound(err)
			}
			if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, &meteringNew, func() error {
				if meteringNew.Spec.Resources == nil {
					meteringNew.Spec.Resources = make(map[v1.ResourceName]meteringv1.ResourcePrice, 0)
				}
				for resourceName, v := range extensionResourcesPrice.Spec.Resources {
					meteringNew.Spec.Resources[resourceName] = v
				}
				//r.Logger.Info("metering", "metering", metering)
				return nil
			}); err != nil {
				return fmt.Errorf("sync resource quota failed: %v", err)
			}

			return nil
		}); err != nil {
			r.Logger.Error(err, "sync metering resource fail")
			continue
		}

	}
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ExtensionResourcesPriceReconciler) SetupWithManager(mgr ctrl.Manager) error {
	const controllerName = "extensionresourcesprice-controller"
	r.Logger = ctrl.Log.WithName(controllerName)
	r.Logger.V(1).Info("init reconcile controller extensionresourcesprice-controller")
	return ctrl.NewControllerManagedBy(mgr).
		For(&meteringv1.ExtensionResourcesPrice{}).
		Complete(r)
}

func GetAllExtensionResources(ctx context.Context, r client.Client) (map[v1.ResourceName]meteringv1.ResourcePrice, error) {
	extensionResourcesPriceList := meteringv1.ExtensionResourcesPriceList{}
	totalResourcePrice := make(map[v1.ResourceName]meteringv1.ResourcePrice, 0)
	err := r.List(ctx, &extensionResourcesPriceList)
	if err != nil {
		return totalResourcePrice, client.IgnoreNotFound(err)
	}
	for _, extensionResourcesPrice := range extensionResourcesPriceList.Items {
		for k, v := range extensionResourcesPrice.Spec.Resources {
			totalResourcePrice[k] = v
		}
	}
	return totalResourcePrice, nil
}
