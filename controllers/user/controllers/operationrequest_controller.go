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
	"k8s.io/client-go/util/retry"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
	kubecontroller "sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

// OperationReqReconciler reconciles a Operationrequest object
type OperationReqReconciler struct {
	Logger   logr.Logger
	Recorder record.EventRecorder
	client.Client
	Scheme             *runtime.Scheme
	cache              cache.Cache
	config             *rest.Config
	finalizer          *utilcontroller.Finalizer
	minRequeueDuration time.Duration
	maxRequeueDuration time.Duration
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
	operationRequests := &userv1.Operationrequest{}
	if err := r.Get(ctx, req.NamespacedName, operationRequests); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	return r.handleRequest(ctx, operationRequests)

	//return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *OperationReqReconciler) SetupWithManager(mgr ctrl.Manager, opts utilcontroller.RateLimiterOptions,
	minRequeueDuration time.Duration, maxRequeueDuration time.Duration) error {
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
	r.minRequeueDuration = minRequeueDuration
	r.maxRequeueDuration = maxRequeueDuration
	//owner := &handler.EnqueueRequestForOwner{OwnerType: &userv1.Operationrequest{}, IsController: true}
	return ctrl.NewControllerManagedBy(mgr).
		For(&userv1.Operationrequest{}).
		WithOptions(kubecontroller.Options{
			MaxConcurrentReconciles: utilcontroller.GetConcurrent(opts),
			RateLimiter:             utilcontroller.GetRateLimiter(opts),
		}).
		Complete(r)
}

func (r *OperationReqReconciler) handleRequest(ctx context.Context, obj client.Object) (ctrl.Result, error) {
	r.Logger.V(1).Info("update reconcile controller operationRequest", "request", client.ObjectKeyFromObject(obj))

	startTime := time.Now()
	request, ok := obj.(*userv1.Operationrequest)
	if !ok {
		return ctrl.Result{}, errors.New("obj convert request is error")
	}
	defer func() {
		r.Logger.V(1).Info("complete request handling",
			"request info", request.Name, "create time", request.CreationTimestamp, "handling cost time", time.Since(startTime))
	}()

	//1.已知username，去获取对应的sa
	sa := &v1.ServiceAccount{}
	if err := r.Get(ctx, client.ObjectKey{Namespace: config.GetUsersNamespace(request.Spec.Username), Name: request.Spec.Username}, sa); err != nil {
		return ctrl.Result{}, err
	}
	//2.根据type，将得到的sa与对应的role建立rolebinding
	//重试
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		var change controllerutil.OperationResult
		var err error
		roleBinding := &rbacv1.RoleBinding{}
		roleBinding.Name = config.GetGroupRoleBindingName(request.Spec.Type, sa.Name)
		//要指定rolebinding的namespace -> 即目标group的namespace -> 即role的namespace
		roleBinding.Namespace = request.Spec.Namespace
		//TODO 3.根据action的add或delete添加或者删除rolebinding
		//要忽略client.IgnoreNotFound(err)这样的error  ->  client.IgnoreNotFound(err) != nil
		//在高并发条件下，这个资源删除了是最终符合预期的，所以要忽略这个error
		if request.Spec.Action == string(userv1.Deprive) {
			if err = r.Delete(ctx, &rbacv1.RoleBinding{
				ObjectMeta: metav1.ObjectMeta{
					Name:      config.GetGroupRoleBindingName(request.Spec.Type, sa.Name),
					Namespace: request.Spec.Namespace,
				},
			}); client.IgnoreNotFound(err) != nil {
				return fmt.Errorf("unable to delete namespace rolebinding by Operationrequest: %w", err)
			}
		} else if change, err = controllerutil.CreateOrUpdate(ctx, r.Client, roleBinding, func() error {
			//或许和rolebinding的命名规范有关？给rolebinding加一些label和annotation
			roleBinding.Annotations = map[string]string{userAnnotationOwnerKey: sa.Name}
			//绑定的是这个group对应的namespace出来的三个role中的一个，与type应该是保持一致的
			roleBinding.RoleRef = rbacv1.RoleRef{
				APIGroup: rbacv1.GroupName,
				Kind:     "Role",
				Name:     request.Spec.Type,
			}
			//绑定到一个sa上，是username得到的sa
			//TODO 这个方法也可以在config里建立一个方法
			roleBinding.Subjects = []rbacv1.Subject{
				{
					Kind:      "ServiceAccount",
					Name:      sa.Name,
					Namespace: sa.Namespace,
				},
			}
			//SetControllerReference将两个资源关联起来 确保两者清理时同时删除
			//return controllerutil.SetControllerReference(sa, roleBinding, r.Scheme)
			//上面这个会报错，因为sa和rolebinding是不同的namespace，所以不能关联起来
			return nil
		}); err != nil {
			return fmt.Errorf("unable to create namespace rolebinding by Operationrequest: %w", err)
		}
		r.Logger.V(1).Info("create or update namespace rolebinding by Operationrequest", "OperationResult", change)
		return nil
	}); err != nil {
		r.Recorder.Eventf(request, v1.EventTypeWarning, "handle Operation Request", "handle rolebinding request %s is error: %v", request, err)
	}
	//TODO 3.等三分钟之后再删掉这个CR
	//TODO 放到上面去
	//TODO 4.将处理的OperationRequest这个CR删除
	if err := r.Delete(ctx, &userv1.Operationrequest{
		ObjectMeta: metav1.ObjectMeta{
			Namespace: request.Namespace,
			Name:      request.Name,
		},
	}); client.IgnoreNotFound(err) != nil {
		r.Logger.Error(err, "failed to delete OperationRequest", "name", request.Name, "namespace", request.Namespace)
		return ctrl.Result{}, fmt.Errorf("failed to delete OperationRequest %s/%s: %w", request.Namespace, request.Name, err)
	}
	//TODO 5.时序问题怎么解决
	return ctrl.Result{}, nil
}
