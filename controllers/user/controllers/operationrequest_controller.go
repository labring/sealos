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

	"github.com/go-logr/logr"

	util "github.com/labring/operator-sdk/controller"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/labring/sealos/controllers/user/controllers/helper/config"

	v1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	controller "sigs.k8s.io/controller-runtime/pkg/controller"
)

// OperationReqRequeueDuration is the time interval to reconcile a OperationRequest if no error occurs
const OperationReqRequeueDuration time.Duration = 30 * time.Second

// OperationReqReconciler reconciles a Operationrequest object
type OperationReqReconciler struct {
	client.Client

	Logger   logr.Logger
	Scheme   *runtime.Scheme
	Recorder record.EventRecorder

	// expirationTime is the time duration of the request is expired
	expirationTime time.Duration
	// retentionTime is the time duration of the request is retained after it is isCompleted
	retentionTime time.Duration
}

// SetupWithManager sets up the controller with the Manager.
func (r *OperationReqReconciler) SetupWithManager(mgr ctrl.Manager, opts util.RateLimiterOptions, expTime time.Duration, retTime time.Duration) error {
	const controllerName = "operationrequest_controller"
	if r.Client == nil {
		r.Client = mgr.GetClient()
	}
	r.Logger = ctrl.Log.WithName(controllerName)
	if r.Recorder == nil {
		r.Recorder = mgr.GetEventRecorderFor(controllerName)
	}
	r.Scheme = mgr.GetScheme()
	r.expirationTime = expTime
	r.retentionTime = retTime
	r.Logger.V(1).Info("init reconcile operationrequest controller")
	return ctrl.NewControllerManagedBy(mgr).
		For(&userv1.Operationrequest{}).
		WithOptions(controller.Options{
			MaxConcurrentReconciles: util.GetConcurrent(opts),
			RateLimiter:             util.GetRateLimiter(opts),
		}).
		Complete(r)
}

// +kubebuilder:rbac:groups=user.sealos.io,resources=operationrequests,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=user.sealos.io,resources=operationrequests/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=user.sealos.io,resources=operationrequests/finalizers,verbs=update

func (r *OperationReqReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	operationRequest := &userv1.Operationrequest{}
	if err := r.Get(ctx, req.NamespacedName, operationRequest); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	return r.reconcile(ctx, operationRequest)
}

func (r *OperationReqReconciler) reconcile(ctx context.Context, request *userv1.Operationrequest) (ctrl.Result, error) {
	r.Logger.V(1).Info("start reconcile controller operationRequest", getLog(request)...)
	// count the time cost of handling the request
	startTime := time.Now()
	defer func() {
		r.Logger.V(1).Info("complete request handling", getLog(request, "create time", request.CreationTimestamp, "handling cost time", time.Since(startTime))...)
	}()

	// delete OperationRequest first if its status is isCompleted and exist for retention time
	if r.isRetained(request) {
		r.Logger.V(1).Info("delete request", getLog(request)...)
		if err := r.deleteRequest(ctx, request); err != nil {
			return ctrl.Result{}, err
		}
		return ctrl.Result{}, nil
	}
	// return early if its status is isCompleted and didn't exist for retention time
	if r.isCompleted(request) {
		r.Logger.V(1).Info("request is completed and requeue", getLog(request)...)
		return ctrl.Result{RequeueAfter: OperationReqRequeueDuration}, nil
	}
	// change OperationRequest status to failed if it is expired
	if r.isExpired(request) {
		r.Logger.V(1).Info("request is expired, update status to failed", getLog(request)...)
		if err := r.updateRequestStatus(ctx, request, userv1.RequestFailed); err != nil {
			return ctrl.Result{}, err
		}
		return ctrl.Result{}, nil
	}

	// update OperationRequest status to processing
	err := r.updateRequestStatus(ctx, request, userv1.RequestProcessing)
	if err != nil {
		return ctrl.Result{}, err
	}

	// convert OperationRequest to RoleBinding
	rolebinding := conventRequestToRolebinding(request)
	r.Logger.V(1).Info("convert OperationRequest to RoleBinding",
		"rolebinding.name", rolebinding.Name,
		"rolebinding.namespace", rolebinding.Namespace,
		"rolebinding.subjects", rolebinding.Subjects,
		"rolebinding.roleRef", rolebinding.RoleRef,
	)

	// handle OperationRequest, create or delete rolebinding
	switch request.Spec.Action {
	case userv1.Grant:
		r.Recorder.Eventf(request, v1.EventTypeNormal, "Grant", "Grant role %s to user %s", request.Spec.Role, request.Spec.User)
		if _, err := ctrl.CreateOrUpdate(ctx, r.Client, rolebinding, func() error { return nil }); err != nil {
			r.Recorder.Eventf(request, v1.EventTypeWarning, "Failed to create/update rolebinding", "Failed to create rolebinding %s/%s", rolebinding.Namespace, rolebinding.Name)
			return ctrl.Result{}, err
		}
		if request.Spec.Role == userv1.OwnerRoleType {
			// update user annotation
			user := &userv1.User{}
			if err := r.Get(ctx, client.ObjectKey{Name: config.GetUserNameByNamespace(request.Namespace)}, user); err != nil {
				r.Recorder.Eventf(request, v1.EventTypeWarning, "Failed to get user", "Failed to get user %s", request.Spec.User)
				return ctrl.Result{}, err
			}

			user.Annotations[userv1.UserAnnotationOwnerKey] = request.Spec.User
			if err := r.Update(ctx, user); err != nil {
				r.Recorder.Eventf(request, v1.EventTypeWarning, "Failed to update user", "Failed to update user %s", request.Spec.User)
				return ctrl.Result{}, err
			}
		}
	case userv1.Deprive:
		r.Recorder.Eventf(request, v1.EventTypeNormal, "Deprive", "Deprive role %s from user %s", request.Spec.Role, request.Spec.User)
		if err := r.Delete(ctx, rolebinding); client.IgnoreNotFound(err) != nil {
			r.Recorder.Eventf(request, v1.EventTypeWarning, "Failed to delete rolebinding", "Failed to delete rolebinding %s/%s", rolebinding.Namespace, rolebinding.Name)
			return ctrl.Result{}, err
		}
	case userv1.Update:
		r.Recorder.Eventf(request, v1.EventTypeNormal, "Update", "Update role %s to user %s", request.Spec.Role, request.Spec.User)
		if err := r.Delete(ctx, rolebinding); client.IgnoreNotFound(err) != nil {
			r.Recorder.Eventf(request, v1.EventTypeWarning, "Failed to delete rolebinding", "Failed to delete rolebinding %s/%s", rolebinding.Namespace, rolebinding.Name)
			return ctrl.Result{}, err
		}
		if _, err := ctrl.CreateOrUpdate(ctx, r.Client, rolebinding, func() error { return nil }); err != nil {
			r.Recorder.Eventf(request, v1.EventTypeWarning, "Failed to create/update rolebinding", "Failed to create rolebinding %s/%s", rolebinding.Namespace, rolebinding.Name)
			return ctrl.Result{}, err
		}
		if request.Spec.Role == userv1.OwnerRoleType {
			// update user annotation
			user := &userv1.User{}
			if err := r.Get(ctx, client.ObjectKey{Name: config.GetUserNameByNamespace(request.Namespace)}, user); err != nil {
				r.Recorder.Eventf(request, v1.EventTypeWarning, "Failed to get user", "Failed to get user %s", request.Spec.User)
				return ctrl.Result{}, err
			}

			user.Annotations[userv1.UserAnnotationOwnerKey] = request.Spec.User
			if err := r.Update(ctx, user); err != nil {
				r.Recorder.Eventf(request, v1.EventTypeWarning, "Failed to update user", "Failed to update user %s", request.Spec.User)
				return ctrl.Result{}, err
			}
		}
	default:
		return ctrl.Result{}, fmt.Errorf("invalid action %s", request.Spec.Action)
	}

	// update OperationRequest status to completed
	err = r.updateRequestStatus(ctx, request, userv1.RequestCompleted)
	if err != nil {
		return ctrl.Result{}, err
	}

	r.Recorder.Eventf(request, v1.EventTypeNormal, "Completed", "Completed operation request %s/%s", request.Namespace, request.Name)
	return ctrl.Result{RequeueAfter: OperationReqRequeueDuration}, nil
}

// isRetained returns true if the request is isCompleted and exist for retention time
func (r *OperationReqReconciler) isRetained(request *userv1.Operationrequest) bool {
	if request.Status.Phase == userv1.RequestCompleted && request.CreationTimestamp.Add(r.retentionTime).Before(time.Now()) {
		return true
	}
	return false
}

// isCompleted returns true if the request is isCompleted
func (r *OperationReqReconciler) isCompleted(request *userv1.Operationrequest) bool {
	return request.Status.Phase == userv1.RequestCompleted
}

// isExpired returns true if the request is expired
func (r *OperationReqReconciler) isExpired(request *userv1.Operationrequest) bool {
	if request.Status.Phase != userv1.RequestCompleted && request.CreationTimestamp.Add(r.expirationTime).Before(time.Now()) {
		return true
	}
	return false
}

func (r *OperationReqReconciler) deleteRequest(ctx context.Context, request *userv1.Operationrequest) error {
	r.Logger.V(1).Info("deleting OperationRequest", "request", request)
	if err := r.Delete(ctx, request); client.IgnoreNotFound(err) != nil {
		r.Recorder.Eventf(request, v1.EventTypeWarning, "Failed to delete OperationRequest", "Failed to delete OperationRequest %s/%s", request.Namespace, request.Name)
		r.Logger.Error(err, "Failed to delete OperationRequest", getLog(request)...)
		return fmt.Errorf("failed to delete OperationRequest %s/%s: %w", request.Namespace, request.Name, err)
	}
	r.Logger.V(1).Info("delete OperationRequest success", getLog(request)...)
	return nil
}

func (r *OperationReqReconciler) updateRequestStatus(ctx context.Context, request *userv1.Operationrequest, phase userv1.RequestPhase) error {
	request.Status.Phase = phase
	if err := r.Status().Update(ctx, request); err != nil {
		r.Recorder.Eventf(request, v1.EventTypeWarning, "Failed to update OperationRequest status", "Failed to update OperationRequest status %s/%s", request.Namespace, request.Name)
		r.Logger.V(1).Info("update OperationRequest status failed", getLog(request)...)
		return err
	}
	r.Logger.V(1).Info("update OperationRequest status success", getLog(request)...)
	return nil
}

func conventRequestToRolebinding(request *userv1.Operationrequest) *rbacv1.RoleBinding {
	return &rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:      config.GetGroupRoleBindingName(request.Spec.User),
			Namespace: request.Namespace,
			Annotations: map[string]string{
				userAnnotationOwnerKey: request.Spec.User,
			},
			Labels: map[string]string{
				userLabelOwnerKey: request.Spec.User,
			},
		},
		Subjects: []rbacv1.Subject{
			{
				Kind:      rbacv1.ServiceAccountKind,
				Name:      request.Spec.User,
				Namespace: config.GetUsersNamespace(request.Spec.User),
			},
		},
		RoleRef: rbacv1.RoleRef{
			Kind:     "Role",
			Name:     string(request.Spec.Role),
			APIGroup: rbacv1.GroupName,
		},
	}
}

func getLog(request *userv1.Operationrequest, kv ...interface{}) []interface{} {
	return append([]interface{}{
		"request.name", request.Name,
		"request.namespace", request.Namespace,
		"request.user", request.Spec.User,
		"request.role", request.Spec.Role,
		"request.action", request.Spec.Action,
		"request.phase", request.Status.Phase,
	}, kv...)
}
