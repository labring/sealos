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
	"strconv"
	"time"

	retry2 "k8s.io/client-go/util/retry"

	"sigs.k8s.io/controller-runtime/pkg/controller"

	"github.com/labring/sealos/pkg/utils/retry"

	corev1 "k8s.io/api/core/v1"

	"github.com/labring/sealos/controllers/pkg/database"
	gonanoid "github.com/matoous/go-nanoid/v2"

	userV1 "github.com/labring/sealos/controllers/user/api/v1"

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

const (
	ACCOUNTNAMESPACEENV         = "ACCOUNT_NAMESPACE"
	DEFAULTACCOUNTNAMESPACE     = "sealos-system"
	AccountAnnotationNewAccount = "account.sealos.io/new-account"
	NEWACCOUNTAMOUNTENV         = "NEW_ACCOUNT_AMOUNT"
)

// AccountReconciler reconciles a Account object
type AccountReconciler struct {
	client.Client
	Scheme                 *runtime.Scheme
	Logger                 logr.Logger
	AccountSystemNamespace string
	MongoDBURI             string
}

//+kubebuilder:rbac:groups=account.sealos.io,resources=accounts,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=account.sealos.io,resources=accounts/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=account.sealos.io,resources=accounts/finalizers,verbs=update
//+kubebuilder:rbac:groups=user.sealos.io,resources=users,verbs=get;list;watch
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
	user := &userV1.User{}
	if err := r.Get(ctx, client.ObjectKey{Namespace: req.Namespace, Name: req.Name}, user); err == nil {
		_, err = r.syncAccount(ctx, user.Name, r.AccountSystemNamespace, "ns-"+user.Name)
		return ctrl.Result{}, err
	} else if client.IgnoreNotFound(err) != nil {
		return ctrl.Result{}, err
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

	account, err := r.syncAccount(ctx, payment.Spec.UserID, r.AccountSystemNamespace, payment.Namespace)
	if err != nil {
		return ctrl.Result{}, fmt.Errorf("get account failed: %v", err)
	}

	orderResp, err := pay.QueryOrder(payment.Status.TradeNO)
	if err != nil {
		return ctrl.Result{}, fmt.Errorf("query order failed: %v", err)
	}
	r.Logger.V(1).Info("query order status", "orderResp", orderResp)
	switch *orderResp.TradeState {
	case pay.StatusSuccess:
		dbCtx := context.Background()
		dbClient, err := database.NewMongoDB(dbCtx, r.MongoDBURI)
		if err != nil {
			r.Logger.Error(err, "connect mongo client failed")
			return ctrl.Result{Requeue: true}, err
		}
		defer func() {
			err := dbClient.Disconnect(ctx)
			if err != nil {
				r.Logger.V(5).Info("disconnect mongo client failed", "err", err)
			}
		}()
		now := time.Now().UTC()
		payAmount := *orderResp.Amount.Total * 10000
		//1¥ = 100WechatPayAmount; 1 WechatPayAmount = 10000 SealosAmount
		var gift = giveGift(payAmount)
		account.Status.Balance += payAmount + gift
		if err := r.Status().Update(ctx, account); err != nil {
			return ctrl.Result{}, fmt.Errorf("update account failed: %v", err)
		}
		payment.Status.Status = pay.StatusSuccess
		if err := r.Status().Update(ctx, payment); err != nil {
			return ctrl.Result{}, fmt.Errorf("update payment failed: %v", err)
		}

		id, err := gonanoid.New(12)
		if err != nil {
			r.Logger.Error(err, "create id failed", "id", id, "payment", payment)
			return ctrl.Result{}, nil
		}
		err = dbClient.SaveBillingsWithAccountBalance(&accountv1.AccountBalanceSpec{
			OrderID: id,
			Amount:  payment.Spec.Amount,
			Owner:   getUsername(payment.Namespace),
			Time:    metav1.Time{Time: now},
			Type:    accountv1.Recharge,
			Details: payment.ToJSON(),
		})
		if err != nil {
			r.Logger.Error(err, "save billings failed", "id", id, "payment", payment)
			return ctrl.Result{}, nil
		}
	case pay.StatusProcessing, pay.StatusNotPay:
		return ctrl.Result{Requeue: true, RequeueAfter: time.Second}, nil
	case pay.StatusFail:
		if err := r.Delete(ctx, payment); err != nil {
			return ctrl.Result{}, fmt.Errorf("delete payment failed: %v", err)
		}
		return ctrl.Result{}, nil
	default:
		return ctrl.Result{}, fmt.Errorf("unknown orderResp: %v", orderResp)
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

	// add account balance when account is new user
	stringAmount := os.Getenv(NEWACCOUNTAMOUNTENV)
	if stringAmount == "" {
		r.Logger.V(1).Info("NEWACCOUNTAMOUNTENV is empty", "account", account)
		return &account, nil
	}

	if newAccountFlag := account.Annotations[AccountAnnotationNewAccount]; newAccountFlag == "false" {
		r.Logger.V(1).Info("account is not a new user ", "account", account)
		return &account, nil
	}

	// should set bonus amount that will give some money to new account
	amount, err := strconv.Atoi(stringAmount)
	if err != nil {
		return nil, fmt.Errorf("convert %s to int failed: %v", stringAmount, err)
	}
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, &account, func() error {
		if account.Annotations == nil {
			account.Annotations = make(map[string]string, 0)
		}
		account.Annotations[AccountAnnotationNewAccount] = "false"
		return nil
	}); err != nil {
		return nil, err
	}
	account.Status.Balance += int64(amount)
	if err := r.Status().Update(ctx, &account); err != nil {
		return nil, err
	}
	r.Logger.Info("account created,will charge new account some money", "account", account, "stringAmount", stringAmount)

	if err := r.syncResourceQuota(ctx, userNamespace); err != nil {
		return nil, fmt.Errorf("sync resource quota failed: %v", err)
	}
	return &account, nil
}

func (r *AccountReconciler) syncResourceQuota(ctx context.Context, nsName string) error {
	quota := &corev1.ResourceQuota{
		ObjectMeta: metav1.ObjectMeta{
			Name:      ResourceQuotaPrefix + nsName,
			Namespace: nsName,
		},
	}

	return retry.Retry(10, 1*time.Second, func() error {
		if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, quota, func() error {
			quota.Spec.Hard = DefaultResourceQuota()
			return nil
		}); err != nil {
			return fmt.Errorf("sync resource quota failed: %v", err)
		}
		return nil
	})
}

func (r *AccountReconciler) syncRoleAndRoleBinding(ctx context.Context, name, namespace string) error {
	role := rbacV1.Role{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "userAccountRole-" + name,
			Namespace: r.AccountSystemNamespace,
		},
	}
	err := retry2.RetryOnConflict(retry2.DefaultRetry, func() error {
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
		return nil
	})
	if err != nil {
		return err
	}
	roleBinding := rbacV1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "userAccountRoleBinding-" + name,
			Namespace: r.AccountSystemNamespace,
		},
	}
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, &roleBinding, func() error {
		roleBinding.RoleRef = rbacV1.RoleRef{
			APIGroup: "rbac.authorization.k8s.io",
			Kind:     "Role",
			Name:     role.Name,
		}
		roleBinding.Subjects = []rbacV1.Subject{
			{
				Kind:      "ServiceAccount",
				Name:      name,
				Namespace: namespace,
			},
		}

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
	if accountBalance.Status.Status == accountv1.Completed {
		return r.Delete(ctx, accountBalance)
	}

	r.Logger.V(1).Info("enter deduction balance", "accountBalanceName", accountBalance.Name, "accountBalanceNamespace", accountBalance.Namespace, ".Spec", accountBalance.Spec, "status", accountBalance.Status)
	account, err := r.syncAccount(ctx, accountBalance.Spec.Owner, r.AccountSystemNamespace, "ns-"+accountBalance.Spec.Owner)
	if err != nil {
		r.Logger.Error(err, err.Error())
		return err
	}

	account.Status.DeductionBalance += accountBalance.Spec.Amount

	if err := r.Status().Update(ctx, account); err != nil {
		r.Logger.Error(err, err.Error())
		return err
	}

	accountBalance.Status.Status = accountv1.Completed
	if err := r.Status().Update(ctx, accountBalance); err != nil {
		r.Logger.Error(err, err.Error())
		return err
	}
	dbCtx := context.Background()
	dbClient, err := database.NewMongoDB(dbCtx, r.MongoDBURI)
	if err != nil {
		r.Logger.Error(err, "connect mongo client failed")
		return fmt.Errorf("failed to connect mongo client: %v", err)
	}
	defer func() {
		err := dbClient.Disconnect(dbCtx)
		if err != nil {
			r.Logger.V(5).Info("disconnect mongo client failed", "err", err)
		}
	}()
	err = dbClient.SaveBillingsWithAccountBalance(&accountBalance.Spec)
	if err != nil {
		r.Logger.Error(err, "save billings with accountBalance failed", "accountBalance", accountBalance.Spec)
	}
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *AccountReconciler) SetupWithManager(mgr ctrl.Manager, rateOpts controller.Options) error {
	const controllerName = "account_controller"
	r.Logger = ctrl.Log.WithName(controllerName)
	r.Logger.V(1).Info("init reconcile controller account")

	r.AccountSystemNamespace = os.Getenv(ACCOUNTNAMESPACEENV)
	if r.AccountSystemNamespace == "" {
		r.AccountSystemNamespace = DEFAULTACCOUNTNAMESPACE
	}
	if r.MongoDBURI = os.Getenv(database.MongoURL); r.MongoDBURI == "" {
		return fmt.Errorf("mongo url is empty")
	}
	return ctrl.NewControllerManagedBy(mgr).
		For(&accountv1.Account{}).
		Watches(&source.Kind{Type: &accountv1.Payment{}}, &handler.EnqueueRequestForObject{}).
		Watches(&source.Kind{Type: &accountv1.AccountBalance{}}, &handler.EnqueueRequestForObject{}).
		Watches(&source.Kind{Type: &userV1.User{}}, &handler.EnqueueRequestForObject{}).
		WithOptions(rateOpts).
		Complete(r)
}

const (
	BaseUnit         = 1_000_000
	Threshold1       = 299 * BaseUnit
	Threshold2       = 599 * BaseUnit
	Threshold3       = 1999 * BaseUnit
	Threshold4       = 4999 * BaseUnit
	Threshold5       = 19999 * BaseUnit
	Ratio1     int64 = 10
	Ratio2     int64 = 15
	Ratio3     int64 = 20
	Ratio4     int64 = 25
	Ratio5     int64 = 30
)

func giveGift(amount int64) int64 {
	var ratio int64
	switch {
	case amount < Threshold1:
		return 0
	case amount < Threshold2:
		ratio = Ratio1
	case amount < Threshold3:
		ratio = Ratio2
	case amount < Threshold4:
		ratio = Ratio3
	case amount < Threshold5:
		ratio = Ratio4
	default:
		ratio = Ratio5
	}
	return amount * ratio / 100
}
