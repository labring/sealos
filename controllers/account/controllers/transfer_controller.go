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

//
//import (
//	"context"
//	"fmt"
//	"os"
//	"strconv"
//	"time"
//
//	"github.com/labring/sealos/controllers/pkg/common"
//
//	"github.com/labring/sealos/controllers/pkg/resources"
//
//	"github.com/labring/sealos/controllers/pkg/database"
//
//	"github.com/labring/sealos/controllers/pkg/crypto"
//
//	"github.com/go-logr/logr"
//	gonanoid "github.com/matoous/go-nanoid/v2"
//	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
//	"sigs.k8s.io/controller-runtime/pkg/builder"
//
//	v1 "github.com/labring/sealos/controllers/pkg/notification/api/v1"
//
//	"k8s.io/apimachinery/pkg/runtime"
//	ctrl "sigs.k8s.io/controller-runtime"
//	"sigs.k8s.io/controller-runtime/pkg/client"
//
//	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
//)
//
//var MinBalance int64 = 10_000000
//
//// TransferReconciler reconciles a Transfer object
//type TransferReconciler struct {
//	Logger logr.Logger
//	client.Client
//	Scheme                 *runtime.Scheme
//	AccountSystemNamespace string
//	DBClient               database.Account
//}
//
////TODO add user, account role
////+kubebuilder:rbac:groups=account.sealos.io,resources=accounts,verbs=get;list;watch;create
////+kubebuilder:rbac:groups=account.sealos.io,resources=accounts/status,verbs=get
////+kubebuilder:rbac:groups=account.sealos.io,resources=transfers,verbs=get;list;watch;create;update;patch;delete
////+kubebuilder:rbac:groups=account.sealos.io,resources=transfers/status,verbs=get;update;patch
////+kubebuilder:rbac:groups=account.sealos.io,resources=transfers/finalizers,verbs=update
////+kubebuilder:rbac:groups=notification.sealos.io,resources=notifications,verbs=get;list;watch;create;update;patch;delete
//
//// Reconcile is part of the main kubernetes reconciliation loop which aims to
//// move the current state of the cluster closer to the desired state.
//// TODO(user): Modify the Reconcile function to compare the state specified by
//// the Transfer object against the actual cluster state, and then
//// perform operations to make the cluster state reflect the state specified by
//// the user.
////
//// For more details, check Reconcile and its Result here:
//// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.11.2/pkg/reconcile
//func (r *TransferReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
//	transfer := accountv1.Transfer{}
//	if err := r.Get(ctx, req.NamespacedName, &transfer); err != nil {
//		return ctrl.Result{}, client.IgnoreNotFound(err)
//	}
//	transfer.Spec.From = getUsername(transfer.Namespace)
//	if time.Since(transfer.CreationTimestamp.Time) > time.Minute*3 {
//		return ctrl.Result{}, r.Delete(ctx, &transfer)
//	}
//	//TODO Error rollback required
//	pipeLine := []func(ctx context.Context, transfer *accountv1.Transfer) error{
//		r.check,
//		r.transferSaver,
//		r.transferAccount,
//	}
//	for _, f := range pipeLine {
//		if err := f(ctx, &transfer); err != nil {
//			transfer.Status.Reason = err.Error()
//			transfer.Status.Progress = accountv1.TransferStateFailed
//			break
//		}
//	}
//	if transfer.Status.Progress != accountv1.TransferStateFailed {
//		transfer.Status.Progress = accountv1.TransferStateCompleted
//	}
//	if err := r.Status().Update(ctx, &transfer); err != nil {
//		return ctrl.Result{}, fmt.Errorf("update transfer status failed: %w", err)
//	}
//	return ctrl.Result{RequeueAfter: 3 * time.Minute}, nil
//}
//
//// SetupWithManager sets up the controller with the Manager.
//func (r *TransferReconciler) SetupWithManager(mgr ctrl.Manager) error {
//	r.AccountSystemNamespace = os.Getenv(ACCOUNTNAMESPACEENV)
//	if r.AccountSystemNamespace == "" {
//		r.AccountSystemNamespace = DEFAULTACCOUNTNAMESPACE
//	}
//	r.Logger = ctrl.Log.WithName("transfer-controller")
//	if m := os.Getenv("TRANSFERMINBALANCE"); m != "" {
//		minBalance, err := strconv.ParseInt(m, 10, 64)
//		if err != nil {
//			r.Logger.Error(err, "parse min balance failed")
//		} else {
//			MinBalance = minBalance
//		}
//	}
//	return ctrl.NewControllerManagedBy(mgr).
//		For(&accountv1.Transfer{}, builder.WithPredicates(OnlyCreatePredicate{})).
//		Complete(r)
//}
//
//func (r *TransferReconciler) transferSaver(ctx context.Context, transfer *accountv1.Transfer) error {
//	idOut, err := gonanoid.New(12)
//	if err != nil {
//		return fmt.Errorf("create id failed: %w", err)
//	}
//	idIn, err := gonanoid.New(12)
//	if err != nil {
//		return fmt.Errorf("create id failed: %w", err)
//	}
//	err = r.DBClient.SaveBillings(&resources.Billing{
//		OrderID:   idOut,
//		Amount:    transfer.Spec.Amount,
//		Owner:     getUsername(transfer.Namespace),
//		Type:      accountv1.TransferOut,
//		Namespace: transfer.Namespace,
//		Time:      transfer.CreationTimestamp.Time,
//		Transfer: &resources.Transfer{
//			To:     transfer.Spec.To,
//			Amount: transfer.Spec.Amount,
//		},
//	}, &resources.Billing{
//		OrderID:   idIn,
//		Amount:    transfer.Spec.Amount,
//		Owner:     getUsername(transfer.Spec.To),
//		Type:      accountv1.TransferIn,
//		Namespace: transfer.Namespace,
//		Time:      transfer.CreationTimestamp.Time,
//		Transfer: &resources.Transfer{
//			From:   transfer.Spec.From,
//			Amount: transfer.Spec.Amount,
//		},
//	})
//	if err != nil {
//		return fmt.Errorf("save billing failed: %w", err)
//	}
//	if err = r.sendNotice(ctx, transfer.Namespace, transfer.Spec.To, transfer.Spec.Amount, accountv1.TransferOut); err != nil {
//		r.Logger.Error(err, "send notice failed")
//	}
//	if err := r.sendNotice(ctx, transfer.Spec.To, transfer.Namespace, transfer.Spec.Amount, accountv1.TransferIn); err != nil {
//		r.Logger.Error(err, "send notice failed")
//	}
//	return nil
//}
//
//func (r *TransferReconciler) transferAccount(ctx context.Context, transfer *accountv1.Transfer) error {
//	from, to := transfer.Namespace, transfer.Spec.To
//	var fromAccount, toAccount accountv1.Account
//	if r.Get(ctx, client.ObjectKey{Namespace: r.AccountSystemNamespace, Name: getUsername(from)}, &fromAccount) != nil {
//		return fmt.Errorf("owner %s account not found", from)
//	}
//	if r.Get(ctx, client.ObjectKey{Namespace: r.AccountSystemNamespace, Name: getUsername(to)}, &toAccount) != nil {
//		return fmt.Errorf("owner %s account not found", to)
//	}
//	balance, _ := crypto.DecryptInt64(*fromAccount.Status.EncryptBalance)
//	deductionBalance, _ := crypto.DecryptInt64(*fromAccount.Status.EncryptDeductionBalance)
//	// check balance is enough ( balance - deductionBalance - transferAmount - MinBalance - ActivityBonus) activity give amount not included
//	if balance < deductionBalance+transfer.Spec.Amount+MinBalance+fromAccount.Status.ActivityBonus {
//		return fmt.Errorf("balance not enough")
//	}
//	if r.Get(ctx, client.ObjectKey{Namespace: r.AccountSystemNamespace, Name: getUsername(to)}, &accountv1.Account{}) != nil {
//		return fmt.Errorf("user %s account not found", transfer.Spec.To)
//	}
//	err := crypto.RechargeBalance(toAccount.Status.EncryptBalance, transfer.Spec.Amount)
//	if err != nil {
//		return err
//	}
//	err = crypto.DeductBalance(fromAccount.Status.EncryptBalance, transfer.Spec.Amount)
//	if err != nil {
//		return err
//	}
//	if err = SyncAccountStatus(ctx, r.Client, &toAccount); err != nil {
//		return fmt.Errorf("sync account status failed: %w", err)
//	}
//	if err = SyncAccountStatus(ctx, r.Client, &fromAccount); err != nil {
//		return fmt.Errorf("sync account status failed: %w", err)
//	}
//	return nil
//}
//
//const (
//	TransferInNotification  = `You have a new transfer from %s, amount: %d`
//	TransferOutNotification = `You have a new transfer to %s, amount: %d`
//)
//
//var transferNotification = map[common.Type]string{
//	accountv1.TransferIn:  TransferInNotification,
//	accountv1.TransferOut: TransferOutNotification,
//}
//
//func (r *TransferReconciler) sendNotice(ctx context.Context, namespace string, user string, amount int64, _type common.Type) error {
//	now := time.Now().UTC().Unix()
//	ntf := v1.Notification{
//		ObjectMeta: metav1.ObjectMeta{
//			Name:      "transfer-notice-" + strconv.FormatInt(now, 10),
//			Namespace: GetUserNamespace(getUsername(namespace)),
//		},
//		Spec: v1.NotificationSpec{
//			Title:      "Transfer Notice",
//			Message:    fmt.Sprintf(transferNotification[_type], GetUserNamespace(getUsername(user)), convertAmount(amount)),
//			From:       "Account-System",
//			Timestamp:  now,
//			Importance: v1.Low,
//		},
//	}
//	return r.Create(ctx, &ntf)
//}
//
//// Convert amount 1¥：1000000
//func convertAmount(amount int64) int64 {
//	return amount / 1_000_000
//}
//
//func (r *TransferReconciler) check(_ context.Context, transfer *accountv1.Transfer) error {
//	if transfer.Spec.Amount <= 0 {
//		return fmt.Errorf("amount must be greater than 0")
//	}
//	if transfer.Status.Progress == accountv1.TransferStateFailed {
//		return fmt.Errorf(transfer.Status.Reason)
//	}
//	if transfer.Status.Progress == accountv1.TransferStateCompleted {
//		return fmt.Errorf("transfer already completed")
//	}
//	from := transfer.Namespace
//	to := transfer.Spec.To
//	if getUsername(from) == getUsername(to) {
//		return fmt.Errorf("can not transfer to self")
//	}
//	return nil
//}
