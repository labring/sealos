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
	"fmt"
	"time"

	"sigs.k8s.io/controller-runtime/pkg/controller"

	ctrl2 "github.com/labring/endpoints-operator/library/controller"

	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	v1 "github.com/labring/sealos/controllers/cluster/api/v1"
	"k8s.io/apimachinery/pkg/types"

	"k8s.io/client-go/util/retry"

	"github.com/labring/sealos/controllers/infra/common"
	"github.com/labring/sealos/pkg/utils/logger"

	infrav1 "github.com/labring/sealos/controllers/infra/api/v1"
	"github.com/labring/sealos/controllers/infra/drivers"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// InfraReconciler reconciles a Infra object
type InfraReconciler struct {
	client.Client
	Scheme    *runtime.Scheme
	driver    map[string]drivers.Driver
	applier   drivers.Reconcile
	recorder  record.EventRecorder
	finalizer *ctrl2.Finalizer
}

type InfraReconcilerOptions struct {
	MaxConcurrentReconciles int
}

//+kubebuilder:rbac:groups=infra.sealos.io,resources=infras,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=infra.sealos.io,resources=infras/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=infra.sealos.io,resources=infras/finalizers,verbs=update
//+kubebuilder:rbac:groups=core,resources=secrets,verbs=get;list;watch;create;update;patch;delete

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Infra object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.12.1/pkg/reconcile
func (r *InfraReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	infra := &infrav1.Infra{}

	if err := r.Get(ctx, req.NamespacedName, infra); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	// add finalizer
	if _, err := r.finalizer.AddFinalizer(ctx, infra); err != nil {
		return ctrl.Result{}, err
	}

	//add pending status
	if infra.Status.Status == "" {
		r.recorder.Eventf(infra, corev1.EventTypeNormal, "InfraPending", "Infra %s status is pending", infra.Name)
		if err := r.updateStatus(ctx, client.ObjectKeyFromObject(infra), v1.Pending.String()); err != nil {
			r.recorder.Event(infra, corev1.EventTypeWarning, "UpdateInfraStatus", err.Error())
			return ctrl.Result{RequeueAfter: time.Second * 3}, err
		}
		return ctrl.Result{RequeueAfter: time.Second * 3}, nil
	}

	logger.Info("infra finalizer: %v, status: %v", infra.Finalizers[0], infra.Status.Status)

	// clean infra using aws terminate
	// now we depend on the aws terminate func to keep consistency
	// TODO: double check the terminated Instance and then remove the finalizer...
	if isDeleted, err := r.finalizer.RemoveFinalizer(ctx, infra, r.DeleteInfra); err != nil {
		return ctrl.Result{RequeueAfter: time.Second * 3}, err
	} else if isDeleted {
		return ctrl.Result{}, nil
	}

	// if infra is failed, we do not need to reconcile again
	if infra.Status.Status == v1.Failed.String() {
		return ctrl.Result{}, nil
	}

	err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		if err := r.Get(ctx, req.NamespacedName, infra); err != nil {
			return client.IgnoreNotFound(err)
		}

		r.recorder.Eventf(infra, corev1.EventTypeNormal, "start to reconcile instance", "%s/%s", infra.Namespace, infra.Name)

		if err := r.applier.ReconcileInstance(infra, r.driver[infra.Spec.Platform]); err != nil {
			r.recorder.Eventf(infra, corev1.EventTypeWarning, "reconcile infra failed", "%v", err)
			return err
		}

		logger.Info("start to update infra...")

		if err := r.Update(ctx, infra); err != nil {
			// if update failed, we need to delete the instance
			logger.Info("update infra failed, delete infra...")
			err2 := r.driver[infra.Spec.Platform].DeleteInfra(infra)
			if err2 != nil {
				logger.Info("delete infra error: %v", err2)
			}
			r.recorder.Eventf(infra, corev1.EventTypeWarning, "update infra failed", "%v", err)
			return err
		}

		if infra.Status.Status != infrav1.Running.String() {
			if err := r.updateStatus(ctx, client.ObjectKeyFromObject(infra), v1.Running.String()); err != nil {
				r.recorder.Event(infra, corev1.EventTypeWarning, "UpdateInfraStatus", err.Error())
				return err
			}
			r.recorder.Eventf(infra, corev1.EventTypeNormal, "infra running success", "%s/%s", infra.Namespace, infra.Name)
		}

		return nil
	})

	if err != nil {
		r.recorder.Eventf(infra, corev1.EventTypeWarning, "update infra failed", "%v", err)
		if err := r.updateStatus(ctx, client.ObjectKeyFromObject(infra), v1.Failed.String()); err != nil {
			r.recorder.Event(infra, corev1.EventTypeWarning, "UpdateInfraStatus", err.Error())
			return ctrl.Result{}, err
		}
		return ctrl.Result{}, err
	}

	return ctrl.Result{}, nil
}

func (r *InfraReconciler) DeleteInfra(ctx context.Context, obj client.Object) error {
	logger.Debug("removing all hosts")
	infra := obj.(*infrav1.Infra)
	infra.Status.Status = infrav1.Terminating.String()
	if err := r.Status().Update(ctx, infra); err != nil {
		r.recorder.Eventf(infra, corev1.EventTypeWarning, "failed to update infra terminating status", "%v", err)
		return fmt.Errorf("update infra error:%v", err)
	}
	err := r.driver[infra.Spec.Platform].DeleteInfra(infra)
	if err != nil {
		return err
	}

	return nil
}

func (r *InfraReconciler) updateStatus(ctx context.Context, nn types.NamespacedName, status string) error {
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		original := &infrav1.Infra{}
		if err := r.Get(ctx, nn, original); err != nil {
			return err
		}
		original.Status.Status = status
		return r.Status().Update(ctx, original)
	})
}

// SetupWithManager sets up the controller with the Manager.
func (r *InfraReconciler) SetupWithManager(mgr ctrl.Manager, opts InfraReconcilerOptions) error {
	r.applier = &drivers.Applier{}
	r.recorder = mgr.GetEventRecorderFor("sealos-infra-controller")
	if r.finalizer == nil {
		r.finalizer = ctrl2.NewFinalizer(r.Client, common.SealosInfraFinalizer)
	}
	r.driver = make(map[string]drivers.Driver)
	var err error
	for _, driverName := range common.DriverList {
		r.driver[driverName], err = drivers.NewDriver(driverName)
	}
	if err != nil {
		return fmt.Errorf("new driver error: %v", err)
	}
	return ctrl.NewControllerManagedBy(mgr).
		For(&infrav1.Infra{}, builder.WithPredicates(
			predicate.Or(predicate.GenerationChangedPredicate{}))).
		WithOptions(controller.Options{
			MaxConcurrentReconciles: opts.MaxConcurrentReconciles,
		}).
		Complete(r)
}
