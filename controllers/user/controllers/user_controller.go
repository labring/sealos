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

	"github.com/go-logr/logr"
	"github.com/labring/endpoints-operator/library/controller"
	"github.com/labring/endpoints-operator/library/convert"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/labring/sealos/controllers/user/controllers/helper"
	"github.com/pkg/errors"
	v1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/tools/record"
	"k8s.io/client-go/util/retry"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

const userAnnotationOwnerKey = "user.sealos.io/creator"

// UserReconciler reconciles a User object
type UserReconciler struct {
	Logger   logr.Logger
	Recorder record.EventRecorder
	cache    cache.Cache
	*runtime.Scheme
	client.Client
	CAKeyFile string
}

//+kubebuilder:rbac:groups=user.sealos.io,resources=users,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=user.sealos.io,resources=users/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=user.sealos.io,resources=users/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the User object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.12.2/pkg/reconcile
func (r *UserReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger.V(4).Info("start reconcile for users")
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
		FinalizerName: "sealos.io/user.finalizers",
	}
	user.APIVersion = ctr.Gvk.GroupVersion().String()
	user.Kind = ctr.Gvk.Kind
	return ctr.Run(ctx, req, user)
}

// SetupWithManager sets up the controller with the Manager.
func (r *UserReconciler) SetupWithManager(mgr ctrl.Manager) error {
	const controllerName = "user_controller"
	if r.Client == nil {
		r.Client = mgr.GetClient()
	}
	r.Logger = ctrl.Log.WithName(controllerName)
	if r.Recorder == nil {
		r.Recorder = mgr.GetEventRecorderFor(controllerName)
	}
	r.Scheme = mgr.GetScheme()
	r.cache = mgr.GetCache()
	r.Logger.V(4).Info("init reconcile controller user")
	return ctrl.NewControllerManagedBy(mgr).
		For(&userv1.User{}).
		Complete(r)
}

func (r *UserReconciler) Delete(ctx context.Context, req ctrl.Request, gvk schema.GroupVersionKind, obj client.Object) error {
	return nil
}

func (r *UserReconciler) Update(ctx context.Context, req ctrl.Request, gvk schema.GroupVersionKind, obj client.Object) (ctrl.Result, error) {
	r.Logger.V(4).Info("update reconcile controller user", "request", req)
	user := &userv1.User{}
	err := convert.JsonConvert(obj, user)
	if err != nil {
		return ctrl.Result{Requeue: true}, err
	}
	user.Status.Phase = userv1.UserPending
	pipelines := []func(ctx context.Context, user *userv1.User){
		r.syncKubeConfig,
		r.syncOwnerUG,
		r.syncOwnerUGUserBinding,
		r.syncOwnerUGNamespaceBinding,
	}

	for _, fn := range pipelines {
		fn(ctx, user)
	}
	if user.Status.Phase != userv1.UserUnknown {
		user.Status.Phase = userv1.UserActive
	}
	err = r.updateStatus(ctx, req.NamespacedName, user.Status.DeepCopy())
	if err != nil {
		r.Recorder.Eventf(user, v1.EventTypeWarning, "SyncStatus", "Sync status %s is error: %v", user.Name, err)
		return ctrl.Result{}, err
	}
	return ctrl.Result{}, nil
}

func (r *UserReconciler) syncKubeConfig(ctx context.Context, user *userv1.User) {
	cfg := &helper.Config{
		CAKeyFile: r.CAKeyFile,
		User:      user.Name,
	}
	if user.Status.KubeConfig == "" {
		data, err := helper.GenerateKubeConfig(*cfg)
		if err != nil {
			user.Status.Phase = userv1.UserUnknown
			r.Recorder.Eventf(user, v1.EventTypeWarning, "syncKubeConfig", "Sync KubeConfig %s is error: %v", user.Name, err)
		}
		user.Status.KubeConfig = string(data)
	}
}

func (r *UserReconciler) syncOwnerUG(ctx context.Context, user *userv1.User) {
	ugName := fmt.Sprintf("ug-%s", user.Name)
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		ug := &userv1.UserGroup{}
		ug.Name = ugName
		var change controllerutil.OperationResult
		var err error
		if change, err = controllerutil.CreateOrUpdate(ctx, r.Client, ug, func() error {
			ug.Annotations = map[string]string{userAnnotationOwnerKey: user.Name}
			return nil
		}); err != nil {
			return errors.Wrap(err, "unable to create UserGroup")
		}
		r.Logger.V(4).Info("create or update UserGroup ", "OperationResult", change)
		return nil
	}); err != nil {
		user.Status.Phase = userv1.UserUnknown
		r.Recorder.Eventf(user, v1.EventTypeWarning, "syncOwnerUG", "Sync OwnerUG %s is error: %v", ugName, err)
	}
}

func (r *UserReconciler) syncOwnerUGUserBinding(ctx context.Context, user *userv1.User) {
	uguBindingName := fmt.Sprintf("ugu-%s", user.Name)
	ugName := fmt.Sprintf("ug-%s", user.Name)
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		ugBinding := &userv1.UserGroupBinding{}
		ugBinding.Name = uguBindingName
		var change controllerutil.OperationResult
		var err error
		if change, err = controllerutil.CreateOrUpdate(ctx, r.Client, ugBinding, func() error {
			ugBinding.Annotations = map[string]string{userAnnotationOwnerKey: user.Name}
			ugBinding.UserGroupRef = ugName
			ugBinding.Subject = rbacv1.Subject{
				Kind:     "User",
				APIGroup: userv1.GroupVersion.String(),
				Name:     user.Name,
			}
			ugBinding.RoleRef = &rbacv1.RoleRef{
				APIGroup: rbacv1.SchemeGroupVersion.String(),
				Kind:     "ClusterRole",
				Name:     "sealos-user-create-role",
			}
			return nil
		}); err != nil {
			return errors.Wrap(err, "unable to create user UserGroupBinding")
		}
		r.Logger.V(4).Info("create or update user UserGroupBinding", "OperationResult", change)
		return nil
	}); err != nil {
		user.Status.Phase = userv1.UserUnknown
		r.Recorder.Eventf(user, v1.EventTypeWarning, "syncOwnerUGUserBinding", "Sync OwnerUGUserBinding %s is error: %v", uguBindingName, err)
	}
}
func (r *UserReconciler) syncOwnerUGNamespaceBinding(ctx context.Context, user *userv1.User) {
	ugnBindingName := fmt.Sprintf("ugn-%s", user.Name)
	nsName := fmt.Sprintf("ns-%s", user.Name)
	ugName := fmt.Sprintf("ug-%s", user.Name)
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		ugBinding := &userv1.UserGroupBinding{}
		ugBinding.Name = ugnBindingName
		var change controllerutil.OperationResult
		var err error
		if change, err = controllerutil.CreateOrUpdate(ctx, r.Client, ugBinding, func() error {
			ugBinding.UserGroupRef = ugName
			ugBinding.Annotations = map[string]string{userAnnotationOwnerKey: user.Name}
			ugBinding.Subject = rbacv1.Subject{
				Kind: "Namespace",
				Name: nsName,
			}
			return nil
		}); err != nil {
			return errors.Wrap(err, "unable to create namespace UserGroupBinding")
		}
		r.Logger.V(4).Info("create or update namespace UserGroupBinding", "OperationResult", change)
		return nil
	}); err != nil {
		user.Status.Phase = userv1.UserUnknown
		r.Recorder.Eventf(user, v1.EventTypeWarning, "syncOwnerUGNamespaceBinding", "Sync OwnerUGNamespaceBinding %s is error: %v", ugnBindingName, err)
	}
}
func (r *UserReconciler) updateStatus(ctx context.Context, nn types.NamespacedName, status *userv1.UserStatus) error {
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		original := &userv1.User{}
		if err := r.Get(ctx, nn, original); err != nil {
			return err
		}
		original.Status = *status
		if err := r.Client.Status().Update(ctx, original); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return err
	}
	return nil
}
