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

	"k8s.io/kubernetes/pkg/apis/core"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	infrav1 "github.com/labring/sealos/controllers/infra/api/v1"
	"github.com/labring/sealos/controllers/infra/drivers"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// InfraReconciler reconciles a Infra object
type InfraReconciler struct {
	client.Client
	Scheme   *runtime.Scheme
	driver   drivers.Driver
	applier  drivers.Reconcile
	recorder record.EventRecorder
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

	if infra.Status.Status == infrav1.Pending.String() {
		return ctrl.Result{}, nil
	}

	if infra.Status.Status == "" {
		infra.Status.Status = infrav1.Pending.String()
		r.recorder.Eventf(infra, core.EventTypeNormal, "InfraPending", "Infra %s status is pending", infra.Name)
		if err := r.Status().Update(ctx, infra); err != nil {
			return ctrl.Result{}, err
		}
	}

	res, err := controllerutil.CreateOrUpdate(ctx, r.Client, infra, func() error {
		r.recorder.Eventf(infra, core.EventTypeNormal, "start to reconcile instance", "%s/%s", infra.Namespace, infra.Name)
		return r.applier.ReconcileInstance(infra, r.driver)
	})
	if err != nil {
		r.recorder.Eventf(infra, core.EventTypeWarning, "update infra failed", "%v", err)
		// requeue after 30 seconds
		return ctrl.Result{RequeueAfter: 30 * time.Second}, err
	}
	if res == controllerutil.OperationResultUpdated {
		if infra.Status.Status == infrav1.Running.String() {
			return ctrl.Result{}, nil
		}
		infra.Status.Status = infrav1.Running.String()
		if err = r.Status().Update(ctx, infra); err != nil {
			r.recorder.Eventf(infra, core.EventTypeWarning, "infra status update failed", "%v", err)
			return ctrl.Result{}, err
		}
		r.recorder.Eventf(infra, core.EventTypeNormal, "infra running success", "%s/%s", infra.Namespace, infra.Name)
	}

	return ctrl.Result{}, nil
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

	return ctrl.NewControllerManagedBy(mgr).
		For(&infrav1.Infra{}).
		Complete(r)
}
