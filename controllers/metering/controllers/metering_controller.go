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
	infrav1 "github.com/labring/sealos/controllers/infra/api/v1"

	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"
	"k8s.io/apimachinery/pkg/api/resource"

	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

const (
	MeteringPrefix      = "metering-"
	ResourceQuotaPrefix = "quota-"
	METERINGNAMESPACE   = "METERING_SYSTEM_NAMESPACE"
)

func init() {
	log.Log.Info(fmt.Sprintf("METERING_SYSTEM_NAMESPACE:%v", os.Getenv(METERINGNAMESPACE)))
	if systemNS := os.Getenv(METERINGNAMESPACE); systemNS == "" {
		os.Setenv(METERINGNAMESPACE, "metering-system")
	}
}

// MeteringReconcile reconciles a Metering object
type MeteringReconcile struct {
	client.Client
	Scheme *runtime.Scheme
	logr.Logger
}

//+kubebuilder:rbac:groups=metering.sealos.io,resources=meterings,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=metering.sealos.io,resources=meterings/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=metering.sealos.io,resources=meterings/finalizers,verbs=update
//+kubebuilder:rbac:groups=core,resources=namespaces,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=infra.sealos.io,resources=infras,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=metering.sealos.io,resources=meteringquotas,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=metering.sealos.io,resources=meteringquotas/status,verbs=get;update;patch

func (r *MeteringReconcile) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger = log.FromContext(ctx)

	var metering meteringv1.Metering
	err := r.Get(ctx, req.NamespacedName, &metering)
	if err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	r.Logger.V(1).Info("update BillingList", "ns", req.NamespacedName)
	err = r.updateBillingList(ctx, metering)
	if err != nil {
		r.Logger.Error(err, err.Error())
		return ctrl.Result{Requeue: true, RequeueAfter: time.Minute}, err
	}
	// Ensure the deployment size is the same as the spec
	return ctrl.Result{Requeue: true, RequeueAfter: time.Minute * time.Duration(metering.Spec.TimeInterval)}, nil
}

func (r *MeteringReconcile) updateBillingList(ctx context.Context, metering meteringv1.Metering) error {
	// check timeInterval is after 1 minute

	if time.Now().Unix()-metering.Status.LatestUpdateTime >= int64(time.Minute.Minutes())*int64(metering.Spec.TimeInterval) {
		// cost price need to pay
		amount, err := r.CalculateCost(ctx, metering)
		if err != nil {
			r.Logger.Error(err, "Failed to calculate cost")
			return err
		}
		r.Logger.Info("calculate total cost", "amount", amount)
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
		metering.Status.TotalAmount += amount
		err = r.Status().Update(ctx, &metering)
		if err != nil {
			return err
		}
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

type ResourceMsg struct {
	resourceName v1.ResourceName
	amount       float64
	Used         *resource.Quantity
	Unit         *resource.Quantity
}

// CalculateCost calculate all cost
func (r *MeteringReconcile) CalculateCost(ctx context.Context, metering meteringv1.Metering) (int64, error) {
	var resourceMsgs []ResourceMsg
	infraAmount, err := r.calculateInfraCost(ctx, metering)
	if err != nil {
		r.Logger.Error(err, "Failed to get InfraCost")
	} else {
		resourceMsgs = append(resourceMsgs, ResourceMsg{
			resourceName: "infra",
			amount:       float64(infraAmount),
		})
	}

	var totalAmount float64
	meteringQuota := meteringv1.MeteringQuota{}
	err = r.Get(ctx, client.ObjectKey{Name: MeteringQuotaPrefix + metering.Spec.Namespace, Namespace: metering.Spec.Namespace}, &meteringQuota)
	if err != nil {
		return 0, fmt.Errorf("failed to get MeteringQuota: %v,metering-quota name: %v,metering-qtupa NS :%v", err, MeteringQuotaPrefix+metering.Spec.Namespace, metering.Spec.Namespace)
	}
	for resourceName, resourceValue := range meteringQuota.Status.Resources {
		if _, ok := metering.Status.Resources[resourceName]; ok {
			amount := float64(resourceValue.Used.MilliValue()) * float64(metering.Status.Resources[resourceName].Price) / float64(metering.Status.Resources[resourceName].Unit.MilliValue())
			resourceMsgs = append(resourceMsgs, ResourceMsg{
				resourceName: resourceName,
				amount:       amount,
				Used:         resourceValue.Used,
				Unit:         metering.Status.Resources[resourceName].Unit,
			})
			totalAmount += amount
		} else {
			r.Logger.Error(fmt.Errorf("resource: %v is not found", resourceName), "Failed to get Resource")
		}
	}
	totalAmount += float64(infraAmount)
	r.Logger.Info("resourceMsg", "resourceMsg", resourceMsgs, "totalAmount", totalAmount)

	for _, v := range meteringQuota.Status.Resources {
		used := resource.MustParse(v.Used.String())
		v.Used.Sub(used)
	}
	err = r.Status().Update(ctx, &meteringQuota)
	if err != nil {
		return 0, err
	}
	return int64(totalAmount), nil
}

func (r *MeteringReconcile) calculateInfraCost(ctx context.Context, metering meteringv1.Metering) (int64, error) {
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

// SetupWithManager sets up the controller with the Manager.
func (r *MeteringReconcile) SetupWithManager(mgr ctrl.Manager) error {
	const controllerName = "metering-controller"
	r.Logger = ctrl.Log.WithName(controllerName)
	r.Logger.V(1).Info("init reconcile controller metering")
	return ctrl.NewControllerManagedBy(mgr).
		For(&meteringv1.Metering{}).
		Complete(r)
}
