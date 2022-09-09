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
	"time"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"
	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"
	"github.com/labring/sealos/controllers/metering/common"
	"github.com/labring/sealos/pkg/utils/logger"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

const (
	FinalizerName       = "metering.sealos.io/finalizer"
	KeepaliveAnnotation = "lastUpdateTime"
)

// MeteringReconcile reconciles a Metering object
type MeteringReconcile struct {
	client.Client
	Scheme *runtime.Scheme
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

// TODO 打印出来使用的资源量

func (r *MeteringReconcile) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	_ = log.FromContext(ctx)
	var quota meteringv1.Metering
	err := r.Get(ctx, req.NamespacedName, &quota)

	if err != nil {
		logger.Error(err, "Failed to get Metering ResourceQuota")
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if quota.DeletionTimestamp.IsZero() {
		if controllerutil.AddFinalizer(&quota, FinalizerName) {
			if err := r.Update(ctx, &quota); err != nil {
				return ctrl.Result{}, err
			}
			// TODO 删除创建的quota
		}
	} else {
		if controllerutil.RemoveFinalizer(&quota, FinalizerName) {
			if err = r.Update(ctx, &quota); err != nil {
				return ctrl.Result{}, err
			}
		}
		return ctrl.Result{}, nil
	}

	found := &corev1.ResourceQuota{}
	err = r.Get(ctx, types.NamespacedName{Name: quota.Name, Namespace: quota.Namespace}, found)

	if err != nil && errors.IsNotFound(err) {
		// Define a new ResourceQuota using nodeCount
		rq, err := r.newResourceQuota(&quota)
		if err != nil {
			logger.Error(err, "Failed to new ResourceQuota", "ResourceQuota.Namespace", rq.Namespace, "ResourceQuota.Name", rq.Name)
			return ctrl.Result{}, err
		}
		logger.Info("Creating a new ResourceQuota", "ResourceQuota.Namespace", rq.Namespace, "ResourceQuota.Name", rq.Name)
		err = r.Create(ctx, rq)
		if err != nil {
			logger.Error(err, "Failed to create new ResourceQuota", "ResourceQuota.Namespace", rq.Namespace, "ResourceQuota.Name", rq.Name)
			return ctrl.Result{}, err
		}
		// ResourceQuota created successfully - return and requeue
		return ctrl.Result{}, nil
	} else if err != nil {
		logger.Error(err, "Failed to get ResourceQuota")
		return ctrl.Result{}, err
	}

	if !r.checkHardMap(found.Spec.Hard, quota.Spec.Resources) {
		found.Spec.Hard = quota.Spec.Resources
		err = r.Update(ctx, found)
		if err != nil {
			logger.Error(err)
			return ctrl.Result{}, err
		}
	}
	logger.Info("update BillingList")
	err = r.updateBillingList(ctx, &quota, &v1.Infra{})
	if err != nil {
		logger.Error(err)
		return ctrl.Result{}, err
	}
	// Ensure the deployment size is the same as the spec

	return ctrl.Result{Requeue: true, RequeueAfter: time.Minute}, nil
}

func (r *MeteringReconcile) updateBillingList(ctx context.Context, quota *meteringv1.Metering, infra *v1.Infra) error {
	// exec r.update will inter reconcile immediately，so should check billing list is Changed
	var isChanged bool
	// check timeInterval is after 1 minute
	if len(quota.Spec.BillingListM) > 0 && time.Now().Unix()-quota.Spec.BillingListM[len(quota.Spec.BillingListM)-1].TimeStamp >= time.Minute.Milliseconds()/1000 {
		isChanged = true
		amount, err := QueryPrice(infra)
		if err != nil {
			return err
		}

		quota.Spec.BillingListM = append(quota.Spec.BillingListM, NewBillingList(common.MINUTE, amount))
		if len(quota.Spec.BillingListM) >= 60 {
			var totalAmountH int64
			for i := 0; i < 60; i++ {
				totalAmountH += quota.Spec.BillingListM[i].Amount
			}
			quota.Spec.BillingListM = quota.Spec.BillingListM[60:]
			quota.Spec.BillingListH = append(quota.Spec.BillingListH, NewBillingList(common.HOUR, totalAmountH))
		}

		if len(quota.Spec.BillingListH) >= 24 {
			var totalAmountD int64
			for i := 0; i < 24; i++ {
				totalAmountD += quota.Spec.BillingListH[i].Amount
			}
			quota.Spec.BillingListH = quota.Spec.BillingListM[24:]
			quota.Spec.BillingListD = append(quota.Spec.BillingListD, NewBillingList(common.DAY, totalAmountD))
		}
	} else {
		time.Sleep(time.Minute)
		isChanged = true
		amount, err := QueryPrice(infra)
		if err != nil {
			return err
		}
		quota.Spec.BillingListM = append(quota.Spec.BillingListM, NewBillingList(common.MINUTE, amount))
	}
	if isChanged {
		err := r.Update(ctx, quota)
		if err != nil {
			return err
		}
	}
	return nil
}

func QueryPrice(infra *v1.Infra) (int64, error) {
	return 1, nil
}

func NewBillingList(TimeInterval string, amount int64) meteringv1.BillingList {
	return meteringv1.BillingList{
		TimeStamp:    time.Now().Unix(),
		TimeInterval: TimeInterval,
		Settled:      false,
		Amount:       amount,
	}
}

func (r *MeteringReconcile) checkHardMap(now, spec corev1.ResourceList) bool {
	if len(now) != len(spec) {
		return false
	}
	for k, v := range spec {
		if now[k] != v {
			return false
		}
	}
	return true
}

// resourcequotaforManagedResourceQuota returns a Resource Quota object
func (r *MeteringReconcile) newResourceQuota(m *meteringv1.Metering) (*corev1.ResourceQuota, error) {
	ls := labelsForResourceQuota(m.Name)
	rq := &corev1.ResourceQuota{
		ObjectMeta: metav1.ObjectMeta{
			Name:      m.Name,
			Namespace: m.Namespace,
			Labels:    ls,
		},
		Spec: corev1.ResourceQuotaSpec{
			Hard: m.Spec.Resources,
		},
	}
	// Set resourcequota instance as the owner and controller
	err := ctrl.SetControllerReference(m, rq, r.Scheme)
	if err != nil {
		return nil, err
	}
	return rq, nil
}

// labelsForResourceQuota returns the labels for selecting the resources
// belonging to the given k8s-resourcequota-autoscaler CR name.
func labelsForResourceQuota(name string) map[string]string {
	return map[string]string{"app.kubernetes.io/managed-by": "k8s-resourcequota-autoscaler", "app.kubernetes.io/name": name}
}

// SetupWithManager sets up the controller with the Manager.
func (r *MeteringReconcile) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&meteringv1.Metering{}).
		Complete(r)
}
