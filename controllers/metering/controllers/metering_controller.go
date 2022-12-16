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
	"strconv"
	"time"

	"k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/apimachinery/pkg/types"

	"github.com/go-logr/logr"
	infrav1 "github.com/labring/sealos/controllers/infra/api/v1"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/source"

	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"

	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	MeteringPrefix           = "metering-"
	ResourceQuotaPrefix      = "quota-"
	METERINGNAMESPACEENV     = "METERING_SYSTEM_NAMESPACE"
	DEFAULTMETERINGNAMESPACE = "metering-system"
)

// MeteringReconcile reconciles a Metering object
type MeteringReconcile struct {
	client.Client
	Scheme *runtime.Scheme
	logr.Logger
	MeteringSystemNameSpace string
	MeteringInterval        int
}

//+kubebuilder:rbac:groups=metering.sealos.io,resources=meterings,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=metering.sealos.io,resources=meterings/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=metering.sealos.io,resources=meterings/finalizers,verbs=update
//+kubebuilder:rbac:groups=metering.sealos.io,resources=extensionresourceprices,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=metering.sealos.io,resources=resources,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=namespaces,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=resourcequotas,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=infra.sealos.io,resources=infras,verbs=get;list;watch;create;update;patch;delete

// Reconcile metering belong to account，resourceQuota belong to metering
func (r *MeteringReconcile) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger.Info("enter reconcile", "name: ", req.Name, "namespace: ", req.Namespace)
	// when user ns create enter this logic
	var ns corev1.Namespace
	if err := r.Get(ctx, req.NamespacedName, &ns); err == nil {
		// if create a user namespace ,will enter this reconcile
		if _, ok := ns.Annotations[userv1.UserAnnotationOwnerKey]; ok {
			if ns.DeletionTimestamp != nil {
				r.Logger.Info("namespace is deleting,want to delete metering", "namespace", ns.Name)
				err := r.DelMetering(ctx, MeteringPrefix+ns.Name, r.MeteringSystemNameSpace)
				return ctrl.Result{}, err
			}
			if err := r.initMetering(ctx, ns); err != nil {
				return ctrl.Result{}, err
			}
		}
		return ctrl.Result{}, nil
	} else if client.IgnoreNotFound(err) != nil {
		return ctrl.Result{}, err
	}

	// when extensionResourcePrice change will enter this logic
	var extensionResourcePrice meteringv1.ExtensionResourcePrice
	if err := r.Get(ctx, req.NamespacedName, &extensionResourcePrice); err == nil {
		meteringList := &meteringv1.MeteringList{}
		err = r.List(ctx, meteringList)
		if err != nil {
			return ctrl.Result{}, client.IgnoreNotFound(err)
		}
		for _, metering := range meteringList.Items {
			if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, &metering, func() error {
				if metering.Spec.Resources == nil {
					metering.Spec.Resources = make(map[corev1.ResourceName]meteringv1.ResourcePriceAndUsed, 0)
				}
				for resourceName, v := range extensionResourcePrice.Spec.Resources {
					metering.Spec.Resources[resourceName] = meteringv1.ResourcePriceAndUsed{ResourcePrice: v, Used: &resource.Quantity{}}
				}
				//r.Logger.Info("metering", "metering", metering)
				return nil
			}); err != nil {
				return ctrl.Result{}, fmt.Errorf("sync metering failed: %v", err)
			}
		}
		//r.Logger.Info("", "meteringList", meteringList)
	} else if client.IgnoreNotFound(err) != nil {
		return ctrl.Result{}, err
	}

	// when Resource create will enter this logic
	resources := &meteringv1.Resource{}
	if err := r.Get(ctx, req.NamespacedName, resources); err == nil && resources.Status.Status != meteringv1.Complete {
		r.Logger.Info("enter update resource used", "resource name: ", req.Name, "resource namespace: ", req.Namespace)
		var metering meteringv1.Metering
		for resourceName, resourceInfo := range resources.Spec.Resources {
			if err := r.Get(ctx, types.NamespacedName{Namespace: r.MeteringSystemNameSpace, Name: MeteringPrefix + resourceInfo.NameSpace}, &metering); err != nil {
				r.Logger.Error(err, "get metering failed", "name", MeteringPrefix+resourceInfo.NameSpace)
				continue
			}
			if _, ok := metering.Spec.Resources[resourceName]; !ok {
				r.Logger.Error(err, "resource not found in metering", "name", MeteringPrefix+resourceInfo.NameSpace)
				continue
			}
			if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, &metering, func() error {
				metering.Spec.Resources[resourceName].Used.Add(*resourceInfo.Used)
				return r.Update(ctx, &metering)
			}); err != nil {
				return ctrl.Result{Requeue: true}, err
			}

			resources.Status.Status = meteringv1.Complete
			err := r.Update(ctx, resources)
			if err != nil {
				return ctrl.Result{Requeue: true}, err
			}
		}
	} else if client.IgnoreNotFound(err) != nil {
		return ctrl.Result{}, err
	}

	var metering meteringv1.Metering
	if err := r.Get(ctx, req.NamespacedName, &metering); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	r.Logger.Info("time", "now:", time.Now().Unix(), "last:", metering.Status.LatestUpdateTime, "internal", int64(time.Minute.Seconds())*int64(metering.Spec.TimeInterval))
	if time.Now().Unix()-metering.Status.LatestUpdateTime >= int64(time.Minute.Minutes())*int64(metering.Spec.TimeInterval) {
		r.Logger.Info("enter update metering", "metering name: ", req.Name, "metering namespace: ", req.Namespace, "lastupdat Time", metering.Status.LatestUpdateTime)
		totalAccount, err := r.CalculateCost(ctx, &metering)
		if err != nil {
			r.Logger.Error(err, err.Error())
			return ctrl.Result{}, err
		}

		if err := r.updateBillingList(ctx, totalAccount, metering); err != nil {
			return ctrl.Result{}, err
		}

		// todo create payment tell account how much need deduction
	}

	return ctrl.Result{Requeue: true, RequeueAfter: time.Minute * time.Duration(r.MeteringInterval)}, nil
}

func (r *MeteringReconcile) CalculateCost(ctx context.Context, metering *meteringv1.Metering) (int64, error) {
	var resourceMsgs []meteringv1.ResourceMsg
	infraAmount, err := r.calculateInfraCost(ctx, metering)
	if err != nil {
		r.Logger.Error(err, "Failed to get InfraCost")
	} else {
		resourceMsgs = append(resourceMsgs, meteringv1.ResourceMsg{
			ResourceName: "infra",
			Amount:       float64(infraAmount),
		})
	}

	var totalAmount float64
	for resourceName, resourceValue := range metering.Spec.Resources {
		if _, ok := metering.Spec.Resources[resourceName]; ok {
			amount := float64(resourceValue.Used.MilliValue()) * float64(resourceValue.Price) / float64(resourceValue.Unit.MilliValue())
			resourceMsgs = append(resourceMsgs, meteringv1.ResourceMsg{
				ResourceName: resourceName,
				Amount:       amount,
				Used:         resourceValue.Used,
				Unit:         resourceValue.Unit,
			})
			totalAmount += amount
		} else {
			r.Logger.Error(fmt.Errorf("resource: %v is not found", resourceName), "Failed to get Resource")
		}
	}
	totalAmount += float64(infraAmount)
	r.Logger.Info(fmt.Sprintf("meteringNmae %v,resourceMsg: %+v", metering.Name, resourceMsgs), "totalAmount", totalAmount)
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, metering, func() error {
		for _, v := range metering.Spec.Resources {
			used := resource.MustParse(v.Used.String())
			v.Used.Sub(used)
		}
		return nil
	}); err != nil {
		return 0, err
	}
	return int64(totalAmount), nil
}

func (r *MeteringReconcile) calculateInfraCost(ctx context.Context, metering *meteringv1.Metering) (int64, error) {
	infraList := &infrav1.InfraList{}
	err := r.List(ctx, infraList)
	//r.Logger.Info("infraList", "infraList", infraList)
	if client.IgnoreNotFound(err) != nil {
		r.Logger.Error(err, "Failed to get InfraList")
		return 0, err
	}
	var amount int64
	for _, infra := range infraList.Items {
		if infra.Namespace == metering.Spec.Namespace {
			count, err := infra.QueryPrice()
			r.Logger.Info("get infra :", "name: ", infra.Name, "namespace: ", infra.Namespace, "price: ", count)
			if err != nil {
				return 0, err
			}
			amount += count
		}
	}
	// amount is preHour,but billing is perMinute
	r.Logger.V(1).Info("infra", "price:", amount)
	return amount, nil
}

func (r *MeteringReconcile) updateBillingList(ctx context.Context, amount int64, metering meteringv1.Metering) error {
	r.Logger.Info("enter metering updateBillingList", "metering name: ", metering.Name, "metering namespace: ", metering.Namespace, "lastupdat Time", metering.Status.LatestUpdateTime)
	metering.Status.BillingListH = append(metering.Status.BillingListH, NewBillingList(meteringv1.HOUR, amount))
	if len(metering.Status.BillingListH) >= 24 {
		var totalAmountD int64
		for i := 0; i < 24; i++ {
			totalAmountD += metering.Status.BillingListH[i].Amount
		}
		metering.Status.BillingListH = metering.Status.BillingListH[24:]
		metering.Status.BillingListD = append(metering.Status.BillingListD, NewBillingList(meteringv1.DAY, totalAmountD))
	}
	metering.Status.TotalAmount += amount
	metering.Status.LatestUpdateTime = time.Now().Unix()
	err := r.Status().Update(ctx, &metering)
	if err != nil {
		return err
	}

	return nil
}

func NewBillingList(TimeInterval meteringv1.TimeIntervalType, amount int64) meteringv1.BillingList {
	return meteringv1.BillingList{
		TimeStamp:    time.Now().Unix(),
		TimeInterval: TimeInterval,
		Settled:      false,
		Amount:       amount,
	}
}

func (r *MeteringReconcile) initMetering(ctx context.Context, ns corev1.Namespace) error {
	totalResourcePrice, err := r.GetAllExtensionResources(ctx)
	if err != nil {
		return err
	}
	r.Logger.Info("totalResourcePrice", "totalResourcePrice", totalResourcePrice)
	if err = r.syncMetering(ctx, ns, totalResourcePrice); err != nil {
		r.Logger.Error(err, "Failed to create Metering")
		return client.IgnoreNotFound(err)
	}
	return nil
}

func (r *MeteringReconcile) syncMetering(ctx context.Context, ns corev1.Namespace, resourcePrice map[corev1.ResourceName]meteringv1.ResourcePriceAndUsed) error {
	metering := meteringv1.Metering{
		ObjectMeta: metav1.ObjectMeta{
			Name:      MeteringPrefix + ns.Name,
			Namespace: r.MeteringSystemNameSpace,
		},
	}

	r.Logger.V(1).Info("metering env", "METERING_INTERVAL", r.MeteringSystemNameSpace, "timeInterval: ", r.MeteringInterval)
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, &metering, func() error {
		metering.Spec.Namespace = ns.Name
		metering.Spec.Owner = ns.Annotations[userv1.UserAnnotationOwnerKey]
		metering.Spec.Resources = resourcePrice
		metering.Spec.TimeInterval = r.MeteringInterval
		return nil
	}); err != nil {
		r.Error(err, "Failed to update Metering")
		return err
	}
	r.Logger.Info("metering Spec", "metering.Spec", metering.Spec)
	// get or create resourceQuota
	if err := r.syncResourceQuota(ctx, metering); err != nil {
		r.Error(err, "Failed to syncResourceQuota")
		return err
	}
	return nil
}

func (r *MeteringReconcile) syncResourceQuota(ctx context.Context, metering meteringv1.Metering) error {
	quota := &corev1.ResourceQuota{
		ObjectMeta: metav1.ObjectMeta{
			Name:      ResourceQuotaPrefix + metering.Spec.Namespace,
			Namespace: metering.Spec.Namespace,
		},
	}

	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, quota, func() error {
		quota.Spec.Hard = meteringv1.DefaultResourceQuota()
		return nil
	}); err != nil {
		return fmt.Errorf("sync resource quota failed: %v", err)
	}
	return nil
}

func (r *MeteringReconcile) DelMetering(ctx context.Context, name, namespace string) error {
	metering := meteringv1.Metering{}
	err := r.Get(ctx, types.NamespacedName{Name: name, Namespace: namespace}, &metering)
	if err != nil {
		return client.IgnoreNotFound(err)
	}
	err = r.Delete(ctx, &metering)
	if err != nil {
		return client.IgnoreNotFound(err)
	}
	return nil
}

func (r *MeteringReconcile) GetAllExtensionResources(ctx context.Context) (map[corev1.ResourceName]meteringv1.ResourcePriceAndUsed, error) {
	extensionResourcesPriceList := meteringv1.ExtensionResourcePriceList{}
	totalResourcePrice := make(map[corev1.ResourceName]meteringv1.ResourcePriceAndUsed, 0)
	err := r.List(ctx, &extensionResourcesPriceList)
	if err != nil {
		return totalResourcePrice, client.IgnoreNotFound(err)
	}
	for _, extensionResourcesPrice := range extensionResourcesPriceList.Items {
		for k, v := range extensionResourcesPrice.Spec.Resources {
			totalResourcePrice[k] = meteringv1.ResourcePriceAndUsed{ResourcePrice: v, Used: &resource.Quantity{}}
		}
	}
	return totalResourcePrice, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *MeteringReconcile) SetupWithManager(mgr ctrl.Manager) error {
	const controllerName = "metering-controller"
	r.Logger = ctrl.Log.WithName(controllerName)
	r.Logger.V(1).Info("reconcile controller metering")

	// get env METERING_SYSTEM_NAMESPACE and METERING_INTERVAL
	r.MeteringSystemNameSpace = os.Getenv(METERINGNAMESPACEENV)
	if os.Getenv(METERINGNAMESPACEENV) == "" {
		r.MeteringSystemNameSpace = DEFAULTMETERINGNAMESPACE
	}

	timeInterval := os.Getenv("METERING_INTERVAL")
	if timeInterval == "" {
		timeInterval = DefaultInterval()
	}
	r.MeteringInterval, _ = strconv.Atoi(timeInterval)
	r.Logger.Info("metering env", METERINGNAMESPACEENV, r.MeteringSystemNameSpace, "timeinterval:", r.MeteringInterval)
	return ctrl.NewControllerManagedBy(mgr).
		For(&meteringv1.Metering{}).
		Watches(&source.Kind{Type: &corev1.Namespace{}}, &handler.EnqueueRequestForObject{}).
		Watches(&source.Kind{Type: &meteringv1.ExtensionResourcePrice{}}, &handler.EnqueueRequestForObject{}).
		Watches(&source.Kind{Type: &meteringv1.Resource{}}, &handler.EnqueueRequestForObject{}).
		Complete(r)
}

func DefaultInterval() string {
	return "60"
}
