/*
Copyright 2023.

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
	"os"
	"strconv"

	"k8s.io/apimachinery/pkg/api/errors"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	v1 "github.com/labring/sealos/controllers/account/api/v1"

	"github.com/go-logr/logr"
	"sigs.k8s.io/controller-runtime/pkg/controller"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// PodReconciler reconciles a Pod object
type PodReconciler struct {
	client.Client
	logr.Logger
	Scheme *runtime.Scheme
}

type PodReconcilerOptions struct {
	MaxConcurrentReconciles int
}

//+kubebuilder:rbac:groups=core,resources=pods,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=pods/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=core,resources=pods/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Pod object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.11.2/pkg/reconcile
func (r *PodReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	// Fetch the pod
	pod := corev1.Pod{}

	err := r.Client.Get(ctx, req.NamespacedName, &pod)
	if err != nil {
		if errors.IsNotFound(err) {
			// Request object not found, could have been deleted after reconcile request.
			// Owned objects are automatically garbage collected. For additional cleanup logic use finalizers.
			// Return and don't requeue
			return reconcile.Result{}, nil
		}
		// Error reading the object - requeue the request.
		return reconcile.Result{}, client.IgnoreNotFound(err)
	}

	if pod.Spec.SchedulerName != v1.DebtSchedulerName {
		return reconcile.Result{}, nil
	}
	pod.Status.Phase = v1.PodPhaseSuspended

	// Update status after reconciliation.
	if err = r.patchStatus(ctx, &pod); err != nil {
		return ctrl.Result{Requeue: true}, client.IgnoreNotFound(err)
	}
	return ctrl.Result{}, nil
}

func (r *PodReconciler) patchStatus(ctx context.Context, pod *corev1.Pod) error {
	key := client.ObjectKeyFromObject(pod)
	latest := &corev1.Pod{}
	if err := r.Client.Get(ctx, key, latest); err != nil {
		return err
	}

	return r.Client.Status().Patch(ctx, pod, client.MergeFrom(latest))
}

// SetupWithManager sets up the controller with the Manager.
func (r *PodReconciler) SetupWithManager(mgr ctrl.Manager) error {
	maxConcurrentReconciles, _ := strconv.Atoi(os.Getenv("MAX_POD_CONCURRENT_RECONCILES"))
	if maxConcurrentReconciles == 0 {
		maxConcurrentReconciles = 2
	}
	r.Logger = ctrl.Log.WithName("controllers").WithName("Pod")
	return ctrl.NewControllerManagedBy(mgr).
		For(&corev1.Pod{}).
		WithOptions(controller.Options{MaxConcurrentReconciles: maxConcurrentReconciles}).
		Complete(r)
}
