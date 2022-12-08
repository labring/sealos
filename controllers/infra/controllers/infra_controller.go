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

	"github.com/labring/endpoints-operator/library/controller"

	"github.com/labring/sealos/controllers/infra/common"
	"github.com/labring/sealos/pkg/utils/logger"

	infrav1 "github.com/labring/sealos/controllers/infra/api/v1"
	"github.com/labring/sealos/controllers/infra/drivers"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

// InfraReconciler reconciles a Infra object
type InfraReconciler struct {
	client.Client
	Scheme    *runtime.Scheme
	driver    drivers.Driver
	applier   drivers.Reconcile
	recorder  record.EventRecorder
	finalizer *controller.Finalizer
}

//+kubebuilder:rbac:groups=infra.sealos.io,resources=infras,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=infra.sealos.io,resources=infras/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=infra.sealos.io,resources=infras/finalizers,verbs=update

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
	if infra.Status.Status == "" {
		infra.Status.Status = infrav1.Pending.String()
		r.recorder.Eventf(infra, corev1.EventTypeNormal, "InfraPending", "Infra %s status is pending", infra.Name)
		if err := r.Status().Update(ctx, infra); err != nil {
			return ctrl.Result{}, err
		}
	}
	res, err := controllerutil.CreateOrUpdate(ctx, r.Client, infra, func() error {
		r.recorder.Eventf(infra, corev1.EventTypeNormal, "start to reconcile instance", "%s/%s", infra.Namespace, infra.Name)
		return r.applier.ReconcileInstance(infra, r.driver)
	})
	if err != nil {
		r.recorder.Eventf(infra, corev1.EventTypeWarning, "update infra failed", "%v", err)
		// requeue after 30 seconds
		return ctrl.Result{RequeueAfter: 30 * time.Second}, err
	}
	// clean infra using aws terminate
	// now we depend on the aws terminate func to keep consistency
	// TODO: double check the terminated Instance and then remove the finalizer...
	var isDelete bool
	if isDelete, err = r.finalizer.RemoveFinalizer(ctx, infra, r.DeleteInfra); err != nil {
		return ctrl.Result{RequeueAfter: 15 * time.Second}, err
	}
	if res == controllerutil.OperationResultUpdated && !isDelete {
		if infra.Status.Status == infrav1.Running.String() {
			return ctrl.Result{}, nil
		}
		infra.Status.Status = infrav1.Running.String()
		if err = r.Status().Update(ctx, infra); err != nil {
			r.recorder.Eventf(infra, corev1.EventTypeWarning, "infra status update failed", "%v", err)
			return ctrl.Result{}, err
		}
		r.recorder.Eventf(infra, corev1.EventTypeNormal, "infra running success", "%s/%s", infra.Namespace, infra.Name)
	}

	return ctrl.Result{}, nil
}

func (r *InfraReconciler) DeleteInfra(ctx context.Context, obj client.Object) error {
	logger.Debug("removing all hosts")
	infra := obj.(*infrav1.Infra)
	infra.Status.Status = infrav1.Terminating.String()
	if err := r.Status().Update(ctx, infra); err != nil {
		r.recorder.Eventf(infra, corev1.EventTypeWarning, "infra status to terminating failed", "%v", err)
		return err
	}
	for _, hosts := range infra.Spec.Hosts {
		if err := r.driver.DeleteInstances(&hosts); err != nil {
			return err
		}
		if err := r.driver.DeleteKeyPair(infra); err != nil {
			return err
		}
	}
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *InfraReconciler) SetupWithManager(mgr ctrl.Manager) error {
	driver, err := drivers.NewDriver()
	if err != nil {
		return fmt.Errorf("infra controller new driver failed: %v", err)
	}
	r.driver = driver
	r.applier = &drivers.Applier{}
	r.recorder = mgr.GetEventRecorderFor("sealos-infra-controller")
	if r.finalizer == nil {
		r.finalizer = controller.NewFinalizer(r.Client, common.SealosInfraFinalizer)
	}
	return ctrl.NewControllerManagedBy(mgr).
		For(&infrav1.Infra{}).
		Complete(r)
}
