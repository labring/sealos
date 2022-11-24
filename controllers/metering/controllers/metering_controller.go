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
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"os"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/source"
	"strconv"
	"time"

	"k8s.io/client-go/util/retry"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	"github.com/go-logr/logr"
	infrav1 "github.com/labring/sealos/controllers/infra/api/v1"

	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"
	"k8s.io/apimachinery/pkg/api/resource"

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
//+kubebuilder:rbac:groups=core,resources=namespaces,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=infra.sealos.io,resources=infras,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=metering.sealos.io,resources=meteringquotas,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=metering.sealos.io,resources=meteringquotas/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=core,resources=namespaces,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=resourcequotas,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=metering.sealos.io,resources=extensionresourcesprices,verbs=get;list;watch;create;update;patch;delete

//Metering_controller will watch namespace and metering CR,if user namespace create will create metering cr
//Metering's responsibility is to calculate the amount of user namespace resources used.

func (r *MeteringReconcile) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	var metering meteringv1.Metering
	ns := corev1.Namespace{}
	err := r.Get(ctx, req.NamespacedName, &ns)

	// user ns create or delete or update
	if err == nil {
		// should create a metering when creating a user namespace
		if _, ok := ns.Annotations[userv1.UserAnnotationOwnerKey]; ok {
			if ns.DeletionTimestamp != nil {
				r.Logger.Info("namespace is deleting,want to delete metering", "namespace", ns.Name)
				err := r.DelMetering(ctx, MeteringPrefix+ns.Name, r.MeteringSystemNameSpace)
				return ctrl.Result{}, err
			}
			if err := r.initMetering(ctx, ns); err != nil {
				return ctrl.Result{}, client.IgnoreNotFound(err)
			}
		}

		if err := r.Get(ctx, req.NamespacedName, &metering); err != nil {
			return ctrl.Result{}, client.IgnoreNotFound(err)
		}

		return ctrl.Result{}, nil
	} else {
		if err := r.Get(ctx, req.NamespacedName, &metering); err != nil {
			return ctrl.Result{}, client.IgnoreNotFound(err)
		}

		// enter calculate logic
		r.Logger.V(1).Info("reconcile metering", "name", metering.Name, "namespace", metering.Namespace, "interval", metering.Spec.TimeInterval, "now", time.Now().String())
		if err = r.updateBillingList(ctx, metering); err != nil {
			return ctrl.Result{Requeue: true}, fmt.Errorf("failed to update billing list,err : %v", err)
		}

	}
	return ctrl.Result{Requeue: true, RequeueAfter: time.Minute * time.Duration(metering.Spec.TimeInterval)}, nil
}

func (r *MeteringReconcile) updateBillingList(ctx context.Context, metering meteringv1.Metering) error {
	// check timeInterval is after 1 hour
	if time.Now().Unix()-metering.Status.LatestUpdateTime >= int64(time.Minute.Seconds())*int64(metering.Spec.TimeInterval) {
		r.Logger.V(1).Info("update BillingList", "ns", metering.Spec.Namespace)
		// cost price need to pay
		amount, err := r.CalculateCost(ctx, &metering)
		if err != nil {
			r.Logger.Error(err, "Failed to calculate cost")
			return client.IgnoreNotFound(err)
		}

		r.Logger.Info("calculate total cost", "amount", amount)
		if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
			if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, &metering, func() error {
				metering.Status.BillingListH = append(metering.Status.BillingListH, NewBillingList(meteringv1.HOUR, amount))
				if len(metering.Status.BillingListH) >= 24 {
					var totalAmountD int64
					for i := 0; i < 24; i++ {
						totalAmountD += metering.Status.BillingListH[i].Amount
					}
					metering.Status.BillingListH = metering.Status.BillingListH[24:]
					metering.Status.BillingListD = append(metering.Status.BillingListD, NewBillingList(meteringv1.DAY, totalAmountD))
				}
				metering.Status.LatestUpdateTime = time.Now().Unix()
				metering.Status.TotalAmount = metering.Status.TotalAmount + amount
				err = r.Status().Update(ctx, &metering)
				return err
			}); err != nil {
				return err
			}
			return nil
		}); err != nil {
			return err
		}
		//r.Logger.Info("interval2", "timeinterval: ", r.MeteringInterval, "metering.Spec.TimeInterval", metering.Spec.TimeInterval, "metering", metering)
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

// CalculateCost calculate all cost
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
	meteringQuota := meteringv1.MeteringQuota{}
	r.Logger.Info("get meteringQuota", "namespace", metering.Spec.Namespace)
	err = r.Get(ctx, client.ObjectKey{Name: MeteringQuotaPrefix + metering.Spec.Namespace, Namespace: metering.Spec.Namespace}, &meteringQuota)
	if err != nil {
		return 0, fmt.Errorf("failed to get MeteringQuota: %v,metering-quota name: %v,metering-qtupa NS :%v", err, MeteringQuotaPrefix+metering.Spec.Namespace, metering.Spec.Namespace)
	}
	for resourceName, resourceValue := range meteringQuota.Spec.Resources {
		if _, ok := metering.Spec.Resources[resourceName]; ok {
			amount := float64(resourceValue.Used.MilliValue()) * float64(metering.Spec.Resources[resourceName].Price) / float64(metering.Spec.Resources[resourceName].Unit.MilliValue())
			resourceMsgs = append(resourceMsgs, meteringv1.ResourceMsg{
				ResourceName: resourceName,
				Amount:       amount,
				Used:         resourceValue.Used,
				Unit:         metering.Spec.Resources[resourceName].Unit,
			})
			totalAmount += amount
		} else {
			r.Logger.Error(fmt.Errorf("resource: %v is not found", resourceName), "Failed to get Resource")
		}
	}
	totalAmount += float64(infraAmount)
	r.Logger.Info(fmt.Sprintf("resourceMsg: %+v", resourceMsgs), "totalAmount", totalAmount, "meteringQuota", meteringQuota.Spec.Resources)
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, &meteringQuota, func() error {
		for _, v := range meteringQuota.Spec.Resources {
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

func (r *MeteringReconcile) initMetering(ctx context.Context, ns corev1.Namespace) error {
	totalResourcePrice, err := GetAllExtensionResources(ctx, r.Client)
	if err != nil {
		return err
	}

	if err = r.syncMetering(ctx, ns, totalResourcePrice); err != nil {
		r.Logger.Error(err, "Failed to create Metering")
		return client.IgnoreNotFound(err)
	}
	return nil
}

func (r *MeteringReconcile) syncMetering(ctx context.Context, ns corev1.Namespace, resourcePrice map[corev1.ResourceName]meteringv1.ResourcePrice) error {

	r.Logger.Info(fmt.Sprintf("SealosSystemNamespace:%v", r.MeteringSystemNameSpace))
	metering := meteringv1.Metering{
		ObjectMeta: metav1.ObjectMeta{
			Name:      MeteringPrefix + ns.Name,
			Namespace: r.MeteringSystemNameSpace,
		},
	}

	//r.Logger.V(1).Info("metering env", "METERING_INTERVAL", r.MeteringSystemNameSpace, "timeinterval: ", r.MeteringInterval)
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

	//r.Logger.Info("create metering ", "metering", metering)
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
		Complete(r)
}

func DefaultInterval() string {
	return "60"
}
