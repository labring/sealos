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

	"github.com/go-logr/logr"
	infrav1 "github.com/labring/sealos/controllers/infra/api/v1"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/source"

	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"

	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"sigs.k8s.io/controller-runtime/pkg/log"
)

var SealosSystemNamespace string

func init() {
	SealosSystemNamespace = os.Getenv("SEALOS_SYSTEM_NAMESPACE")
}

const (
	FinalizerName          = "metering.sealos.io/finalizer"
	UserAnnotationOwnerKey = "user.sealos.io/creator"
)

// MeteringReconcile reconciles a Metering object
type MeteringReconcile struct {
	client.Client
	Scheme *runtime.Scheme
	logr.Logger
}

//+kubebuilder:rbac:groups=metering.sealos.io,resources=meterings,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=metering.sealos.io,resources=meterings/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=metering.sealos.io,resources=meterings/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// the Metering object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.11.2/pkg/reconcile

func DefaultResourceQuota() corev1.ResourceList {
	return corev1.ResourceList{
		corev1.ResourceCPU:          resource.MustParse("1"),
		corev1.ResourceMemory:       resource.MustParse("1Gi"),
		corev1.ResourceLimitsCPU:    resource.MustParse("1"),
		corev1.ResourceLimitsMemory: resource.MustParse("1Gi"),
	}
}

// metering belong to account，resourceQuota belong to metering

func (r *MeteringReconcile) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger = log.FromContext(ctx)
	var metering meteringv1.Metering
	r.Logger.Info("enter reconcile", "name: ", req.Name, "namespace: ", req.Namespace)

	// if create a user namespace ,will enter this reconcile
	if req.Name != SealosSystemNamespace {
		var ns corev1.Namespace
		err := r.Get(ctx, req.NamespacedName, &ns)
		if err != nil {
			return ctrl.Result{}, client.IgnoreNotFound(err)
		}
		if _, ok := ns.Annotations[UserAnnotationOwnerKey]; !ok {
			r.Logger.Info(fmt.Sprintf("not found owner of namespace name: %v", ns.Name))
			return ctrl.Result{}, nil
		}
		owner := ns.Annotations[UserAnnotationOwnerKey]
		if metering, err = r.createMetering(ctx, owner, ns); err != nil {
			r.Logger.Error(err, "Failed to get Metering")
			return ctrl.Result{}, client.IgnoreNotFound(err)
		}

		// get or create resourceQuota
		if err = r.syncResourceQuota(ctx, metering); err != nil {
			return ctrl.Result{}, err
		}
	} else {
		if err := r.Get(ctx, req.NamespacedName, &metering); err != nil {
			return ctrl.Result{}, client.IgnoreNotFound(err)
		}
		//// metering finalizer
		//if metering.DeletionTimestamp.IsZero() {
		//	if controllerutil.AddFinalizer(&metering, FinalizerName) == true {
		//		//TODO delete resource quota
		//		if err := r.Update(ctx, &metering); err != nil {
		//			return ctrl.Result{}, err
		//		}
		//	}
		//} else {
		//	if controllerutil.RemoveFinalizer(&metering, FinalizerName) == true {
		//		if err := r.Update(ctx, &metering); err != nil {
		//			return ctrl.Result{}, err
		//		}
		//	}
		//	return ctrl.Result{}, nil
		//}
	}
	// get or create resourceQuota
	if err := r.syncResourceQuota(ctx, metering); err != nil {
		return ctrl.Result{}, err
	}

	r.Logger.Info("update BillingList")
	err := r.updateBillingList(ctx, &metering)
	if err != nil {
		r.Logger.Error(err, err.Error())
		return ctrl.Result{}, err
	}
	// Ensure the deployment size is the same as the spec
	return ctrl.Result{Requeue: true, RequeueAfter: time.Minute}, nil
}

func (r *MeteringReconcile) createMetering(ctx context.Context, owner string, ns corev1.Namespace) (meteringv1.Metering, error) {
	var metering meteringv1.Metering
	err := r.Get(ctx, client.ObjectKey{Namespace: SealosSystemNamespace, Name: fmt.Sprintf("metering-%v", ns.Name)}, &metering)
	if errors.IsNotFound(err) {
		r.Logger.Info("creat metering")
		metering = meteringv1.Metering{
			ObjectMeta: metav1.ObjectMeta{
				Name:      fmt.Sprintf("metering-%v", ns.Name),
				Namespace: SealosSystemNamespace,
			},
			Spec: meteringv1.MeteringSpec{
				Namespace: ns.Name,
				Owner:     owner,
				Resources: DefaultResourceQuota(),
			},
			Status: meteringv1.MeteringStatus{
				TotalAmount:      0,
				LatestUpdateTime: time.Now().Unix(),
			},
		}
		if err := r.Create(ctx, &metering); err != nil {
			return meteringv1.Metering{}, fmt.Errorf("create metering failed: %v", err)
		}
	} else if err != nil {
		r.Logger.Error(err, "Failed to get Metering")
		return meteringv1.Metering{}, client.IgnoreNotFound(err)
	}
	return metering, nil
}

func (r *MeteringReconcile) syncResourceQuota(ctx context.Context, metering meteringv1.Metering) error {
	quota := &corev1.ResourceQuota{
		ObjectMeta: metav1.ObjectMeta{
			Name:      metering.Name,
			Namespace: metering.Spec.Namespace,
		},
	}
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, quota, func() error {
		quota.Spec.Hard = metering.Spec.Resources
		return nil
	}); err != nil {
		return fmt.Errorf("sync resource quota failed: %v", err)
	}
	return nil
}

func (r *MeteringReconcile) updateBillingList(ctx context.Context, metering *meteringv1.Metering) error {
	// check timeInterval is after 1 minute
	if time.Now().Unix()-metering.Status.LatestUpdateTime >= time.Minute.Milliseconds()/1000 {
		infraList := &infrav1.InfraList{}
		err := r.List(ctx, infraList)
		if err != nil {
			return err
		}
		var amount int64
		for _, infra := range infraList.Items {
			count, err := infra.QueryPrice()
			r.Logger.Info("get infra :", "name: ", infra.Name, "namespace: ", infra.Namespace, "price: ", count)
			if err != nil {
				return err
			}
			amount += count
		}
		// amount is preHour,but billing is perMinute
		amount /= 60
		// TODO Billing for resources such as memory and hard disks under namesapce

		metering.Status.BillingListM = append(metering.Status.BillingListM, NewBillingList(meteringv1.MINUTE, amount))
		if len(metering.Status.BillingListM) >= 60 {
			var totalAmountH int64
			for i := 0; i < 60; i++ {
				totalAmountH += metering.Status.BillingListM[i].Amount
			}
			metering.Status.BillingListM = metering.Status.BillingListM[60:]
			metering.Status.BillingListH = append(metering.Status.BillingListH, NewBillingList(meteringv1.HOUR, totalAmountH))
		}

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
		err = r.Status().Update(ctx, metering)
		if err != nil {
			return err
		}

		account := &userv1.Account{
			ObjectMeta: metav1.ObjectMeta{
				Name:      metering.Spec.Owner,
				Namespace: SealosSystemNamespace,
			},
		}
		err = r.Get(ctx, client.ObjectKey{Namespace: SealosSystemNamespace, Name: account.Name}, account)
		if err != nil {
			r.Logger.Error(err, "get account err", "account", account)
			return err
		}
		//deduct balance
		account.Status.Balance -= amount

		err = r.Status().Update(ctx, account)
		if err != nil {
			return err
		}
		r.Logger.Info("DebitSuccess ,", "user:", account.Name, "balance", account.Status.Balance)
		//TODO reportNoMoneyError
		//if account.Status.Balance < 0 {
		//}
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

// SetupWithManager sets up the controller with the Manager.
func (r *MeteringReconcile) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&meteringv1.Metering{}).
		Watches(&source.Kind{Type: &corev1.Namespace{}}, &handler.EnqueueRequestForObject{}).
		Complete(r)
}
