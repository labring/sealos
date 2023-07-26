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
	"errors"
	"fmt"
	"time"

	"github.com/go-logr/logr"
	utilcontroller "github.com/labring/operator-sdk/controller"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/labring/sealos/controllers/user/controllers/helper/config"
	v1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
	kubecontroller "sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

// Time interval for loop control
var OperationReqRequeueDuration, _ = time.ParseDuration("1m")

// OperationReqReconciler reconciles a Operationrequest object
type OperationReqReconciler struct {
	Logger   logr.Logger
	Recorder record.EventRecorder
	client.Client
	Scheme *runtime.Scheme
	cache  cache.Cache
	config *rest.Config
}

//+kubebuilder:rbac:groups=user.sealos.io,resources=operationrequests,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=user.sealos.io,resources=operationrequests/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=user.sealos.io,resources=operationrequests/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Operationrequest object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.13.1/pkg/reconcile
func (r *OperationReqReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger.V(1).Info("start create or delete rolebinding for operation requests")
	operationRequest := &userv1.Operationrequest{}
	if err := r.Get(ctx, req.NamespacedName, operationRequest); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	return r.reconcile(ctx, operationRequest)
	//TODO operationRequest的状态更新
	//TODO 时序问题怎么解决  -> 写个webhook -> 同一个ns下的request要一个个处理
	//TODO 3min删除operationrequest的功能不知道为啥失效了
}

// SetupWithManager sets up the controller with the Manager.
func (r *OperationReqReconciler) SetupWithManager(mgr ctrl.Manager, opts utilcontroller.RateLimiterOptions) error {
	const controllerName = "operationrequest_controller"
	if r.Client == nil {
		r.Client = mgr.GetClient()
	}
	r.Logger = ctrl.Log.WithName(controllerName)
	if r.Recorder == nil {
		r.Recorder = mgr.GetEventRecorderFor(controllerName)
	}
	//if r.finalizer == nil {
	//	r.finalizer = utilcontroller.NewFinalizer(r.Client, "sealos.io/user.finalizers")
	//}
	r.Scheme = mgr.GetScheme()
	r.cache = mgr.GetCache()
	r.config = mgr.GetConfig()
	r.Logger.V(1).Info("init reconcile operationrequest controller")
	//owner := &handler.EnqueueRequestForOwner{OwnerType: &userv1.Operationrequest{}, IsController: true}
	return ctrl.NewControllerManagedBy(mgr).
		For(&userv1.Operationrequest{}).
		WithOptions(kubecontroller.Options{
			MaxConcurrentReconciles: utilcontroller.GetConcurrent(opts),
			RateLimiter:             utilcontroller.GetRateLimiter(opts),
		}).
		Complete(r)
}

func (r *OperationReqReconciler) reconcile(ctx context.Context, obj client.Object) (ctrl.Result, error) {
	r.Logger.V(1).Info("update reconcile controller operationRequest", "request", client.ObjectKeyFromObject(obj))

	// reconcile start time
	startTime := time.Now()
	// Convert input object to operation request
	request, ok := obj.(*userv1.Operationrequest)
	if !ok {
		return ctrl.Result{}, errors.New("obj convert request is error")
	}
	defer func() {
		r.Logger.V(1).Info("complete request handling",
			"request info", request.Name, "create time", request.CreationTimestamp, "handling cost time", time.Since(startTime))
	}()

	// delete OperationRequest first if it is expired
	if r.isExpired(request) {
		if _, err := r.deleteOperationRequest(ctx, request); client.IgnoreNotFound(err) != nil {
			return ctrl.Result{}, err
		}
	} else {
		// Get the service account associated with the request
		sa := &v1.ServiceAccount{}
		if err := r.Get(ctx, client.ObjectKey{Namespace: config.GetUsersNamespace(request.Spec.Username), Name: request.Spec.Username}, sa); err != nil {
			return ctrl.Result{}, err
		}

		// Check if the action is "Deprive" or "Update" and delete the role binding if true
		if request.Spec.Action == userv1.Deprive || request.Spec.Action == userv1.Update {
			if _, err := r.deleteRoleBinding(ctx, request, sa); client.IgnoreNotFound(err) != nil {
				return ctrl.Result{}, err
			}
		}

		// Check if the action is "Grant" or "Update" and create the role binding if true
		if request.Spec.Action == userv1.Grant || request.Spec.Action == userv1.Update {
			if _, err := r.createRoleBinding(ctx, request, sa); err != nil {
				return ctrl.Result{}, err
			}
		}
		return ctrl.Result{}, nil

		// Define the pipeline of functions
		//pipelines := []func(ctx context.Context, request *userv1.Operationrequest, sa *v1.ServiceAccount) (context.Context, error){
		//	r.deleteRoleBinding,
		//	r.createRoleBinding,
		//}
		//
		//// Execute the pipeline of functions
		//for _, step := range pipelines {
		//	if _, err := step(ctx, request, sa); err != nil {
		//		return ctrl.Result{}, err
		//	}
		//}
		//if request.Status.Phase != userv1.RequestPending {
		//	request.Status.Phase = userv1.RequestActive
		//}
		//err := r.updateStatus(ctx, client.ObjectKeyFromObject(obj), request.Status.DeepCopy())
		//if err != nil {
		//	r.Recorder.Eventf(request, v1.EventTypeWarning, "SyncStatus", "Sync status %s is error: %v", request.Name, err)
		//	return ctrl.Result{}, err
		//}
	}
	return ctrl.Result{RequeueAfter: OperationReqRequeueDuration}, nil
}

func (r *OperationReqReconciler) deleteOperationRequest(ctx context.Context, request *userv1.Operationrequest) (ctrl.Result, error) {
	r.Logger.V(1).Info("Deleting OperationRequest", "request", request)

	// Delete the OperationRequest
	if err := r.Delete(ctx, &userv1.Operationrequest{
		ObjectMeta: metav1.ObjectMeta{
			Namespace: request.Namespace,
			Name:      request.Name,
		},
	}); client.IgnoreNotFound(err) != nil {
		r.Logger.Error(err, "Failed to delete OperationRequest", "name", request.Name, "namespace", request.Namespace)
		return ctrl.Result{}, fmt.Errorf("failed to delete OperationRequest %s/%s: %w", request.Namespace, request.Name, err)
	}

	r.Logger.Info("Deleted OperationRequest", "request", request)
	return ctrl.Result{}, nil
}

//func (r *OperationReqReconciler) initStatus(ctx context.Context, request *userv1.Operationrequest, sa *v1.ServiceAccount) (context.Context, error) {
//	request.Status.Phase = userv1.RequestPending
//
//	return ctx, nil
//}

func (r *OperationReqReconciler) deleteRoleBinding(ctx context.Context, request *userv1.Operationrequest, sa *v1.ServiceAccount) (context.Context, error) {
	r.Logger.V(1).Info("Deleting operation request", "request", request)
	if err := r.Delete(ctx, &rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:      config.GetGroupRoleBindingName(sa.Name),
			Namespace: request.Spec.Namespace,
		},
	}); client.IgnoreNotFound(err) != nil {
		return ctx, fmt.Errorf("unable to delete namespace rolebinding by Operationrequest: %w", err)
	}
	r.Logger.Info("Deleted role binding for OperationRequest", "request", request)
	return ctx, nil
}

func (r *OperationReqReconciler) createRoleBinding(ctx context.Context, request *userv1.Operationrequest, sa *v1.ServiceAccount) (context.Context, error) {
	r.Logger.V(1).Info("Creating role binding for OperationRequest", "request", request)
	var change controllerutil.OperationResult
	var err error
	// Create or update the role binding
	roleBinding := &rbacv1.RoleBinding{}
	roleBinding.Name = config.GetGroupRoleBindingName(sa.Name)
	// rolebinding's namespace -> group's namespace -> role's namespace
	roleBinding.Namespace = request.Spec.Namespace
	if change, err = controllerutil.CreateOrUpdate(ctx, r.Client, roleBinding, func() error {
		roleBinding.Annotations = map[string]string{userAnnotationOwnerKey: sa.Name}
		roleBinding.RoleRef = rbacv1.RoleRef{
			APIGroup: rbacv1.GroupName,
			Kind:     "Role",
			Name:     request.Spec.Type,
		}
		roleBinding.Subjects = []rbacv1.Subject{
			{
				Kind:      "ServiceAccount",
				Name:      sa.Name,
				Namespace: sa.Namespace,
			},
		}
		return nil
	}); err != nil {
		return ctx, fmt.Errorf("unable to create or update namespace rolebinding by Operationrequest: %w", err)
	}
	r.Logger.V(1).Info("create or update namespace rolebinding by Operationrequest", "OperationResult", change)
	return ctx, nil
}

func (r *OperationReqReconciler) isExpired(request *userv1.Operationrequest) bool {
	// Expiration time = 3 min
	d, _ := time.ParseDuration(userv1.ExpirationTime)
	if request.CreationTimestamp.Add(d).Before(time.Now()) {
		r.Logger.Info("request isExpired", "name", request.Name)
		return true
	}
	return false
}
