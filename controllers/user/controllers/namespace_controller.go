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
	"strings"

	"github.com/labring/sealos/controllers/user/controllers/helper/config"

	"github.com/go-logr/logr"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/tools/record"
	"k8s.io/client-go/util/retry"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

// NamespaceReconciler reconciles a Namespace object
type NamespaceReconciler struct {
	Logger   logr.Logger
	Recorder record.EventRecorder
	*runtime.Scheme
	client.Client
}

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the User object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.12.2/pkg/reconcile
func (r *NamespaceReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	ns := &v1.Namespace{}
	if err := r.Get(ctx, req.NamespacedName, ns); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if strings.HasPrefix(ns.Name, "ns-") {
		r.Logger.V(1).Info("start reconcile for ns", "ns", ns.Name)
		err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
			change, err := controllerutil.CreateOrUpdate(ctx, r.Client, ns, func() error {
				if ns.Labels == nil {
					ns.Labels = map[string]string{}
				}
				ns.Labels = config.SetPodSecurity(ns.Labels)
				return nil
			})
			if err != nil {
				return err
			}
			r.Logger.V(1).Info("create or update ns", "change", change, "ns", ns.Name)
			return nil
		})
		if err != nil {
			r.Logger.Error(err, "create or update ns error", "ns", ns.Name)
			return ctrl.Result{}, err
		}
	}

	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *NamespaceReconciler) SetupWithManager(mgr ctrl.Manager) error {
	const controllerName = "namespace_controller"
	if r.Client == nil {
		r.Client = mgr.GetClient()
	}
	r.Logger = ctrl.Log.WithName(controllerName)
	if r.Recorder == nil {
		r.Recorder = mgr.GetEventRecorderFor(controllerName)
	}
	r.Scheme = mgr.GetScheme()
	r.Logger.V(1).Info("init reconcile controller namespace")
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1.Namespace{}, builder.WithPredicates(
			predicate.Or(predicate.AnnotationChangedPredicate{}, predicate.LabelChangedPredicate{}))).
		Complete(r)
}
