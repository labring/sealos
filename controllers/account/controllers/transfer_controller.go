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
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/labring/sealos/controllers/pkg/crypto"

	"github.com/go-logr/logr"
	v1 "github.com/labring/sealos/controllers/common/notification/api/v1"
	gonanoid "github.com/matoous/go-nanoid/v2"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/builder"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

var MinBalance int64 = 10_000000

// TransferReconciler reconciles a Transfer object
type TransferReconciler struct {
	Logger logr.Logger
	client.Client
	Scheme                 *runtime.Scheme
	AccountSystemNamespace string
}

//TODO add user, account role
//+kubebuilder:rbac:groups=account.sealos.io,resources=accounts,verbs=get;list;watch;create
//+kubebuilder:rbac:groups=account.sealos.io,resources=accounts/status,verbs=get
//+kubebuilder:rbac:groups=account.sealos.io,resources=accountbalances,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=account.sealos.io,resources=accountbalances/status,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=account.sealos.io,resources=transfers,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=account.sealos.io,resources=transfers/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=account.sealos.io,resources=transfers/finalizers,verbs=update
//+kubebuilder:rbac:groups=notification.sealos.io,resources=notifications,verbs=get;list;watch;create;update;patch;delete

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Transfer object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.11.2/pkg/reconcile
func (r *TransferReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	transfer := accountv1.Transfer{}
	if err := r.Get(ctx, req.NamespacedName, &transfer); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	transfer.Spec.From = getUsername(transfer.Namespace)
	if time.Since(transfer.CreationTimestamp.Time) > time.Minute*3 {
		return ctrl.Result{}, r.Delete(ctx, &transfer)
	}
	pipeLine := []func(ctx context.Context, transfer *accountv1.Transfer) error{
		r.check,
		r.TransferOutSaver,
		r.TransferInSaver,
	}
	for _, f := range pipeLine {
		if err := f(ctx, &transfer); err != nil {
			transfer.Status.Reason = err.Error()
			transfer.Status.Progress = accountv1.TransferStateFailed
			break
		}
	}
	if transfer.Status.Progress != accountv1.TransferStateFailed {
		transfer.Status.Progress = accountv1.TransferStateCompleted
	}
	if err := r.Status().Update(ctx, &transfer); err != nil {
		return ctrl.Result{}, fmt.Errorf("update transfer status failed: %w", err)
	}
	return ctrl.Result{RequeueAfter: 3 * time.Minute}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *TransferReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.AccountSystemNamespace = os.Getenv(ACCOUNTNAMESPACEENV)
	if r.AccountSystemNamespace == "" {
		r.AccountSystemNamespace = DEFAULTACCOUNTNAMESPACE
	}
	r.Logger = ctrl.Log.WithName("transfer-controller")
	if m := os.Getenv("TRANSFERMINBALANCE"); m != "" {
		minBalance, err := strconv.ParseInt(m, 10, 64)
		if err != nil {
			r.Logger.Error(err, "parse min balance failed")
		} else {
			MinBalance = minBalance
		}
	}
	return ctrl.NewControllerManagedBy(mgr).
		For(&accountv1.Transfer{}, builder.WithPredicates(OnlyCreatePredicate{})).
		Complete(r)
}

func (r *TransferReconciler) TransferOutSaver(ctx context.Context, transfer *accountv1.Transfer) error {
	id, err := gonanoid.New(12)
	if err != nil {
		return fmt.Errorf("create id failed: %w", err)
	}
	objMeta := metav1.ObjectMeta{
		Name:      getUsername(transfer.Namespace) + "-" + time.Now().UTC().Format("20060102150405"),
		Namespace: r.AccountSystemNamespace,
	}
	balanceSpec := accountv1.AccountBalanceSpec{
		OrderID: id,
		Amount:  transfer.Spec.Amount,
		Owner:   getUsername(transfer.Namespace),
		Time:    metav1.Time{Time: time.Now().UTC()},
		Type:    accountv1.TransferOut,
		Details: transfer.ToJSON(),
	}
	from := accountv1.AccountBalance{
		ObjectMeta: objMeta,
		Spec:       balanceSpec,
	}
	if err := r.Create(ctx, &from); err != nil {
		return fmt.Errorf("create transfer accountbalance failed: %w", err)
	}
	return r.sendNotice(ctx, transfer.Namespace, transfer.Spec.To, transfer.Spec.Amount, accountv1.TransferOut)
}

const (
	TransferInNotification  = `You have a new transfer from %s, amount: %d`
	TransferOutNotification = `You have a new transfer to %s, amount: %d`
)

var transferNotification = map[accountv1.Type]string{
	accountv1.TransferIn:  TransferInNotification,
	accountv1.TransferOut: TransferOutNotification,
}

func (r *TransferReconciler) sendNotice(ctx context.Context, namespace string, user string, amount int64, _type accountv1.Type) error {
	now := time.Now().UTC().Unix()
	ntf := v1.Notification{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "transfer-notice-" + strconv.FormatInt(now, 10),
			Namespace: GetUserNamespace(getUsername(namespace)),
		},
		Spec: v1.NotificationSpec{
			Title:      "Transfer Notice",
			Message:    fmt.Sprintf(transferNotification[_type], GetUserNamespace(getUsername(user)), convertAmount(amount)),
			From:       "Account-System",
			Timestamp:  now,
			Importance: v1.Low,
		},
	}
	return r.Create(ctx, &ntf)
}

// Convert amount 1¥：1000000
func convertAmount(amount int64) int64 {
	return amount / 1_000_000
}

func (r *TransferReconciler) TransferInSaver(ctx context.Context, transfer *accountv1.Transfer) error {
	id, err := gonanoid.New(12)
	if err != nil {
		return fmt.Errorf("create id failed: %w", err)
	}
	objMeta := metav1.ObjectMeta{
		Name:      getUsername(transfer.Spec.To) + "-" + time.Now().UTC().Format("200601021504"),
		Namespace: r.AccountSystemNamespace,
	}
	balanceSpec := accountv1.AccountBalanceSpec{
		OrderID: id,
		Amount:  transfer.Spec.Amount,
		Owner:   getUsername(transfer.Spec.To),
		Time:    metav1.Time{Time: time.Now().UTC()},
		Type:    accountv1.TransferIn,
		Details: transfer.ToJSON(),
	}
	to := accountv1.AccountBalance{
		ObjectMeta: objMeta,
		Spec:       balanceSpec,
	}
	if err := r.Create(ctx, &to); err != nil {
		return fmt.Errorf("create transfer accountbalance failed: %w", err)
	}
	return r.sendNotice(ctx, transfer.Spec.To, transfer.Namespace, transfer.Spec.Amount, accountv1.TransferIn)
}

func (r *TransferReconciler) check(ctx context.Context, transfer *accountv1.Transfer) error {
	if transfer.Spec.Amount <= 0 {
		return fmt.Errorf("amount must be greater than 0")
	}
	if transfer.Status.Progress == accountv1.TransferStateFailed {
		return fmt.Errorf(transfer.Status.Reason)
	}
	if transfer.Status.Progress == accountv1.TransferStateCompleted {
		return fmt.Errorf("transfer already completed")
	}
	from := transfer.Namespace
	to := transfer.Spec.To
	if getUsername(from) == getUsername(to) {
		return fmt.Errorf("can not transfer to self")
	}
	fromAccount := accountv1.Account{}
	if r.Get(ctx, client.ObjectKey{Namespace: r.AccountSystemNamespace, Name: getUsername(from)}, &fromAccount) != nil {
		return fmt.Errorf("owner %s account not found", from)
	}
	balance, _ := crypto.DecryptInt64(*fromAccount.Status.EncryptBalance)
	deductionBalance, _ := crypto.DecryptInt64(*fromAccount.Status.EncryptDeductionBalance)
	if balance < deductionBalance+transfer.Spec.Amount+MinBalance {
		return fmt.Errorf("balance not enough")
	}
	if r.Get(ctx, client.ObjectKey{Namespace: r.AccountSystemNamespace, Name: getUsername(to)}, &accountv1.Account{}) != nil {
		return fmt.Errorf("user %s account not found", transfer.Spec.To)
	}
	return nil
}
