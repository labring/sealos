/*
Copyright 2022.

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
	"os"

	"github.com/go-logr/logr"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	rbacV1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

type AccountUserReconciler struct {
	client.Client
	Scheme           *runtime.Scheme
	Logger           logr.Logger
	AccountNamespace string
}

const DEFAULTACCOUNTNAMESPACE = "sealos-system"

//+kubebuilder:rbac:groups=account.sealos.io,resources=accountusers,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=account.sealos.io,resources=accountusers/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=account.sealos.io,resources=accountusers/finalizers,verbs=update
//+kubebuilder:rbac:groups=user.sealos.io,resources=users,verbs=get;list;watch;create;update;patch;delete

func (r *AccountUserReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	user := &userv1.User{}
	err := r.Get(ctx, req.NamespacedName, user)
	if err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	if err := r.syncAccount(ctx, user); err != nil {
		return ctrl.Result{}, err
	}

	if err := r.syncRoleAndRoleBinding(ctx, user); err != nil {
		return ctrl.Result{}, err
	}

	return ctrl.Result{}, nil
}

func (r *AccountUserReconciler) syncAccount(ctx context.Context, user *userv1.User) error {
	account := userv1.Account{
		ObjectMeta: metav1.ObjectMeta{
			Name:      user.Name,
			Namespace: r.AccountNamespace,
		},
	}
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, &account, func() error {
		err := controllerutil.SetOwnerReference(user, &account, r.Scheme)
		if err != nil {
			return err
		}
		return nil
	}); err != nil {
		r.Logger.Error(err, "sync account error")
		return err
	}
	return nil
}

func (r *AccountUserReconciler) syncRoleAndRoleBinding(ctx context.Context, user *userv1.User) error {
	role := rbacV1.Role{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "userAccountRole-" + user.Name,
			Namespace: r.AccountNamespace,
		},
	}
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, &role, func() error {
		role.Rules = []rbacV1.PolicyRule{
			{
				APIGroups:     []string{"user.sealos.io"},
				Resources:     []string{"accounts"},
				Verbs:         []string{"get", "watch", "list"},
				ResourceNames: []string{user.Name},
			},
		}
		return controllerutil.SetControllerReference(user, &role, r.Scheme)
	}); err != nil {
		r.Logger.Error(fmt.Errorf("create role failed: %v,username: %v,namespace: %v", err, user.Name, r.AccountNamespace), "create role failed")
		return err
	}
	roleBinding := rbacV1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "userAccountRoleBinding-" + user.Name,
			Namespace: r.AccountNamespace,
		},
	}
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, &roleBinding, func() error {
		roleBinding.RoleRef = rbacV1.RoleRef{
			APIGroup: "rbac.authorization.k8s.io",
			Kind:     "Role",
			Name:     role.Name,
		}
		return controllerutil.SetControllerReference(user, &roleBinding, r.Scheme)
	}); err != nil {
		r.Logger.Error(fmt.Errorf("create roleBinding failed: %v,username: %v,namespace: %v", err, user.Name, r.AccountNamespace), "create role failed")
		return err
	}
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *AccountUserReconciler) SetupWithManager(mgr ctrl.Manager) error {
	const controllerName = "account_user_controller"
	r.Logger = ctrl.Log.WithName(controllerName)
	r.AccountNamespace = os.Getenv("ACCOUNT_NAMESPACE")
	if r.AccountNamespace == "" {
		r.AccountNamespace = DEFAULTACCOUNTNAMESPACE
	}

	r.Logger.V(1).Info("start reconcile for account create when user create")
	return ctrl.NewControllerManagedBy(mgr).
		For(&userv1.User{}).
		Complete(r)
}
