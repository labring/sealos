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
	"github.com/labring/sealos/controllers/user/controllers/helper/config"
	v1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/tools/record"
	"k8s.io/client-go/util/retry"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
)

// OperationRequestReconciler reconciles a OperationRequest object
type OperationRequestReconciler struct {
	Logger   logr.Logger
	Recorder record.EventRecorder
	client.Client
	Scheme *runtime.Scheme
}

//+kubebuilder:rbac:groups=user.sealos.io,resources=operationrequests,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=user.sealos.io,resources=operationrequests/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=user.sealos.io,resources=operationrequests/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the OperationRequest object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.13.1/pkg/reconcile
func (r *OperationRequestReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	_ = log.FromContext(ctx)

	// TODO(user): your logic here
	r.Logger.V(1).Info("start create or delete rolebinding for operation requests")
	operationRequests := &userv1.OperationRequest{}
	if err := r.Get(ctx, req.NamespacedName, operationRequests); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err) //获取operationRequests以
	}

	return r.handleRequest(ctx, operationRequests)

	//return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *OperationRequestReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&userv1.OperationRequest{}).
		Complete(r)
}

func (r *OperationRequestReconciler) handleRequest(ctx context.Context, obj client.Object) (ctrl.Result, error) {
	r.Logger.V(1).Info("update reconcile controller operationRequest", "request", client.ObjectKeyFromObject(obj))

	startTime := time.Now()
	request, ok := obj.(*userv1.OperationRequest)
	if !ok {
		return ctrl.Result{}, errors.New("obj convert request is error")
	}
	defer func() {
		r.Logger.V(1).Info("complete request handling", "request info", request.Name, "create time", request.CreationTimestamp, "handling cost time", time.Since(startTime))
	}()

	//1.已知username，去获取对应的sa
	sa := &v1.ServiceAccount{}
	if err := r.Get(ctx, client.ObjectKey{Namespace: config.GetUsersNamespace(request.Spec.Username), Name: request.Spec.Username}, sa); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	//2.根据type，将得到的sa与对应的role建立rolebinding
	//重试
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		var change controllerutil.OperationResult
		var err error
		roleBinding := &rbacv1.RoleBinding{}
		//TODO 3.根据action的add或delete添加或者删除rolebinding
		if request.Spec.Action == string(userv1.Delete) {
			if err = r.Delete(ctx, &rbacv1.RoleBinding{
				ObjectMeta: metav1.ObjectMeta{
					Name:        config.GetGroupRoleBindingName(sa.Name),
					Annotations: map[string]string{userAnnotationOwnerKey: sa.Name},
				},
			}); err != nil {
				return fmt.Errorf("unable to delete namespace rolebinding by User: %w", err)
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
			roleBinding.Subjects = []rbacv1.Subject{
				{
					Kind:      "ServiceAccount",
					APIGroup:  rbacv1.GroupName,
					Name:      sa.Name,
					Namespace: sa.Namespace,
				},
			}
			roleBinding.Name = config.GetGroupRoleBindingName(sa.Name)
			//SetControllerReference将两个资源关联起来 确保两者清理时同时删除
			return controllerutil.SetControllerReference(sa, roleBinding, r.Scheme)
		}); err != nil {
			return fmt.Errorf("unable to create namespace rolebinding by User: %w", err)
		}
		r.Logger.V(1).Info("create or update namespace rolebinding by User", "OperationResult", change)
		return nil
	}); err != nil {
		r.Recorder.Eventf(request, v1.EventTypeWarning, "handle Operation Request", "handle rolebinding request %s is error: %v", request, err)
	}
	//TODO 4.将处理的OperationRequest这个CR删除
	if err := r.Delete(ctx, &userv1.OperationRequest{
		ObjectMeta: metav1.ObjectMeta{
			Namespace: request.Namespace,
			Name:      request.Name,
		},
	}); err != nil {
		r.Logger.Error(err, "failed to delete OperationRequest", "name", request.Name, "namespace", request.Namespace)
		return ctrl.Result{}, fmt.Errorf("failed to delete OperationRequest %s/%s: %w", request.Namespace, request.Name, err)
	}
	//TODO 5.时序问题怎么解决

	//TODO 6.转移Owner时的label字段怎么改
	if request.Spec.Type == string(userv1.Owner) {
		ns := &v1.Namespace{}
		ns.Name = request.Namespace
		if err := r.Get(ctx, client.ObjectKeyFromObject(ns), ns); err != nil {
			if !apierrors.IsNotFound(err) {
				return ctrl.Result{}, err
			}
		}
		patch := []byte(fmt.Sprintf(`{"metadata":{"labels":{"%s":"%s"}}}`, userLabelOwnerKey, request.Spec.Username))
		if err := r.Patch(ctx, ns, client.RawPatch(types.StrategicMergePatchType, patch)); err != nil {
			return ctrl.Result{}, err
		}
	}
	return ctrl.Result{}, nil
}
