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

	"github.com/go-logr/logr"
	"github.com/labring/endpoints-operator/library/controller"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// UserExpirationReconciler reconciles a Secret object
type UserExpirationReconciler struct {
	Logger   logr.Logger
	Recorder record.EventRecorder
	config   *rest.Config
	*runtime.Scheme
	client.Client
}

//+kubebuilder:rbac:groups=core,resources=secrets,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=secrets/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=core,resources=secrets/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Secret object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.11.0/pkg/reconcile
func (r *UserExpirationReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger.V(1).Info("start reconcile for users expiration")
	user := &userv1.User{}
	ctr := controller.Controller{
		Client:   r.Client,
		Logger:   r.Logger,
		Eventer:  r.Recorder,
		Operator: r,
		Gvk: schema.GroupVersionKind{
			Group:   userv1.GroupVersion.Group,
			Version: userv1.GroupVersion.Version,
			Kind:    "User",
		},
		FinalizerName: "sealos.io/user.expiration.finalizers",
	}
	user.APIVersion = ctr.Gvk.GroupVersion().String()
	user.Kind = ctr.Gvk.Kind
	return ctr.Run(ctx, req, user)
}

// SetupWithManager sets up the controller with the Manager.
func (r *UserExpirationReconciler) SetupWithManager(mgr ctrl.Manager) error {
	const controllerName = "user_expiration_controller"
	if r.Client == nil {
		r.Client = mgr.GetClient()
	}
	r.Logger = ctrl.Log.WithName(controllerName)
	if r.Recorder == nil {
		r.Recorder = mgr.GetEventRecorderFor(controllerName)
	}
	r.Scheme = mgr.GetScheme()
	r.config = mgr.GetConfig()
	r.Logger.V(1).Info("init reconcile controller user expiration")
	return ctrl.NewControllerManagedBy(mgr).
		For(&userv1.User{}).
		Complete(r)
}

func (r *UserExpirationReconciler) Delete(ctx context.Context, req ctrl.Request, gvk schema.GroupVersionKind, obj client.Object) error {
	r.Logger.V(1).Info("delete reconcile controller user expiration", "request", req)
	//TODO delete sa
	return nil
}

func (r *UserExpirationReconciler) Update(ctx context.Context, req ctrl.Request, gvk schema.GroupVersionKind, obj client.Object) (ctrl.Result, error) {
	//TODO add  Expiration logic
	return ctrl.Result{}, nil
}
