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
	"os"
	"time"

	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"

	"github.com/labring/sealos/controllers/user/controllers/helper"

	"github.com/go-logr/logr"

	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	rbacV1 "k8s.io/api/rbac/v1"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/labring/sealos/pkg/pay"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/source"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const ACCOUNTNAMESPACEENV = "ACCOUNT_NAMESPACE"
const DEFAULTACCOUNTNAMESPACE = "sealos-system"

// AccountReconciler reconciles a Account object
type AccountReconciler struct {
	client.Client
	Scheme                 *runtime.Scheme
	Logger                 logr.Logger
	AccountSystemNameSpace string
}

//+kubebuilder:rbac:groups=account.sealos.io,resources=accounts,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=account.sealos.io,resources=accounts/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=account.sealos.io,resources=accounts/finalizers,verbs=update
//+kubebuilder:rbac:groups=account.sealos.io,resources=accountbalances,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=account.sealos.io,resources=accountbalances/status,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=rolebindings,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=roles,verbs=get;list;watch;create;update;patch;delete

func (r *AccountReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	//It should not stop the normal process for the failure to delete the payment
	// delete payments that exist for more than 5 minutes
	if err := r.DeletePayment(ctx); err != nil {
		r.Logger.Error(err, "delete payment failed")
	}

	accountBalance := accountv1.AccountBalance{}
	if err := r.Get(ctx, req.NamespacedName, &accountBalance); err == nil {
		if err := r.updateDeductionBalance(ctx, &accountBalance); err != nil {
			r.Logger.Error(err, err.Error())
			return ctrl.Result{}, err
		}
	} else if client.IgnoreNotFound(err) != nil {
		return ctrl.Result{}, err
	}

	payment := &accountv1.Payment{}
	if err := r.Get(ctx, client.ObjectKey{Namespace: req.Namespace, Name: req.Name}, payment); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	if payment.Spec.UserID == "" || payment.Spec.Amount == 0 {
		return ctrl.Result{}, fmt.Errorf("payment is invalid: %v", payment)
	}
	if payment.Status.TradeNO == "" {
		return ctrl.Result{Requeue: true, RequeueAfter: time.Millisecond * 300}, nil
	}
	if payment.Status.Status == pay.StatusSuccess {
		return ctrl.Result{}, nil
	}

	account, err := r.syncAccount(ctx, payment.Spec.UserID, r.AccountSystemNameSpace, payment.Namespace)
	if err != nil {
		return ctrl.Result{}, fmt.Errorf("get account failed: %v", err)
	}

	status, err := pay.QueryOrder(payment.Status.TradeNO)
	if err != nil {
		return ctrl.Result{}, fmt.Errorf("query order failed: %v", err)
	}
	r.Logger.V(1).Info("query order status", "status", status)
	switch status {
	case pay.StatusSuccess:
		account.Status.ChargeList = append(account.Status.ChargeList, accountv1.Charge{
			Amount:  payment.Spec.Amount,
			Time:    metav1.Now(),
			Status:  status,
			TradeNO: payment.Status.TradeNO,
		})
		account.Status.Balance += payment.Spec.Amount
		if err := r.Status().Update(ctx, account); err != nil {
			return ctrl.Result{}, fmt.Errorf("update account failed: %v", err)
		}
		payment.Status.Status = status
		if err := r.Status().Update(ctx, payment); err != nil {
			return ctrl.Result{}, fmt.Errorf("update payment failed: %v", err)
		}

	case pay.StatusProcessing, pay.StatusNotPay:
		return ctrl.Result{Requeue: true, RequeueAfter: time.Second}, nil
	case pay.StatusFail:
		if err := r.Delete(ctx, payment); err != nil {
			return ctrl.Result{}, fmt.Errorf("delete payment failed: %v", err)
		}
		return ctrl.Result{}, nil
	default:
		return ctrl.Result{}, fmt.Errorf("unknown status: %v", status)
	}

	return ctrl.Result{}, nil
}

func (r *AccountReconciler) syncAccount(ctx context.Context, name, accountNamespace string, userNamespace string) (*accountv1.Account, error) {
	account := accountv1.Account{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: accountNamespace,
		},
	}
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, &account, func() error {
		return nil
	}); err != nil {
		return nil, err
	}
	// add role get account permission
	if err := r.syncRoleAndRoleBinding(ctx, name, userNamespace); err != nil {
		return nil, fmt.Errorf("sync role and rolebinding failed: %v", err)
	}
	return &account, nil
}

func (r *AccountReconciler) syncRoleAndRoleBinding(ctx context.Context, name, namespace string) error {
	role := rbacV1.Role{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "userAccountRole-" + name,
			Namespace: r.AccountSystemNameSpace,
		},
	}
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, &role, func() error {
		role.Rules = []rbacV1.PolicyRule{
			{
				APIGroups:     []string{"account.sealos.io"},
				Resources:     []string{"accounts"},
				Verbs:         []string{"get", "watch", "list"},
				ResourceNames: []string{name},
			},
		}
		return nil
	}); err != nil {
		return fmt.Errorf("create role failed: %v,username: %v,namespace: %v", err, name, namespace)
	}
	roleBinding := rbacV1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "userAccountRoleBinding-" + name,
			Namespace: r.AccountSystemNameSpace,
		},
	}
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, &roleBinding, func() error {
		roleBinding.RoleRef = rbacV1.RoleRef{
			APIGroup: "rbac.authorization.k8s.io",
			Kind:     "Role",
			Name:     role.Name,
		}
		roleBinding.Subjects = helper.GetUsersSubject(name)

		return nil
	}); err != nil {
		return fmt.Errorf("create roleBinding failed: %v,rolename: %v,username: %v,ns: %v", err, role.Name, name, namespace)
	}
	return nil
}

// DeletePayment delete payments that exist for more than 5 minutes
func (r *AccountReconciler) DeletePayment(ctx context.Context) error {
	payments := &accountv1.PaymentList{}
	err := r.List(ctx, payments)
	if err != nil {
		return err
	}
	for _, payment := range payments.Items {
		if time.Since(payment.CreationTimestamp.Time) > time.Minute*5 {
			err = r.Delete(ctx, &payment)
			if err != nil {
				return err
			}
		}
	}
	return nil
}

func (r *AccountReconciler) updateDeductionBalance(ctx context.Context, accountBalance *accountv1.AccountBalance) error {
	if accountBalance.Status.Status == meteringv1.Complete {
		return nil
	}

	r.Logger.V(1).Info("enter deduction balance", "accountBalanceName", accountBalance.Name, "accountBalanceNameSpace", accountBalance.Namespace, ".Spec", accountBalance.Spec, "status", accountBalance.Status)
	account, err := r.syncAccount(ctx, accountBalance.Spec.Owner, r.AccountSystemNameSpace, "ns-"+accountBalance.Spec.Owner)
	if err != nil {
		r.Logger.Error(err, err.Error())
		return err
	}

	account.Status.DeductionBalance += accountBalance.Spec.Amount
	account.Status.ChargeList = append(account.Status.ChargeList, accountv1.Charge{
		Amount:             accountBalance.Spec.Amount,
		Time:               metav1.Now(),
		Status:             string(accountBalance.Status.Status),
		AccountBalanceName: accountBalance.Name,
	})

	if err := r.Status().Update(ctx, account); err != nil {
		r.Logger.Error(err, err.Error())
		return err
	}

	accountBalance.Status.Status = meteringv1.Complete
	if err := r.Status().Update(ctx, accountBalance); err != nil {
		r.Logger.Error(err, err.Error())
		return err
	}
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *AccountReconciler) SetupWithManager(mgr ctrl.Manager) error {
	const controllerName = "account_controller"
	r.Logger = ctrl.Log.WithName(controllerName)
	r.Logger.V(1).Info("init reconcile controller account")

	r.AccountSystemNameSpace = os.Getenv(ACCOUNTNAMESPACEENV)
	if r.AccountSystemNameSpace == "" {
		r.AccountSystemNameSpace = DEFAULTACCOUNTNAMESPACE
	}
	return ctrl.NewControllerManagedBy(mgr).
		For(&accountv1.Account{}).
		Watches(&source.Kind{Type: &accountv1.Payment{}}, &handler.EnqueueRequestForObject{}).
		Watches(&source.Kind{Type: &accountv1.AccountBalance{}}, &handler.EnqueueRequestForObject{}).
		Complete(r)
}
