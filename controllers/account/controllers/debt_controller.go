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
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"time"

	"github.com/labring/sealos/controllers/pkg/database"

	"sigs.k8s.io/controller-runtime/pkg/controller"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	v1 "github.com/labring/sealos/controllers/common/notification/api/v1"

	"sigs.k8s.io/controller-runtime/pkg/event"

	"github.com/labring/sealos/controllers/pkg/utils"

	corev1 "k8s.io/api/core/v1"

	"k8s.io/apimachinery/pkg/types"

	"github.com/go-logr/logr"
	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

const DebtDetectionCycleEnv = "DebtDetectionCycleSeconds"

// DebtReconciler reconciles a Debt object
type DebtReconciler struct {
	client.Client
	Scheme             *runtime.Scheme
	DebtDetectionCycle time.Duration
	logr.Logger
	accountSystemNamespace string
	accountNamespace       string
}

var DebtStatusDuration = map[accountv1.DebtStatusType]int64{}
var DebtNoticeInterval = map[accountv1.DebtStatusType]int64{}
var DebtNoticeText = map[accountv1.DebtStatusType]string{}

//+kubebuilder:rbac:groups=account.sealos.io,resources=debts,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=account.sealos.io,resources=debts/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=account.sealos.io,resources=debts/finalizers,verbs=update
//+kubebuilder:rbac:groups=account.sealos.io,resources=accounts,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=notification.sealos.io,resources=notifications,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=namespaces,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=metering.common.sealos.io,resources=extensionresourceprices,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=pods,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=apps,resources=daemonsets,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=apps,resources=replicasets,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=apps,resources=statefulsets,verbs=get;list;watch;create;update;patch;delete

func (r *DebtReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	debt := &accountv1.Debt{}
	account := &accountv1.Account{}
	if err := r.Get(ctx, req.NamespacedName, account); err == nil {
		if account.DeletionTimestamp != nil {
			return ctrl.Result{}, nil
		}
		if err := r.Get(ctx, client.ObjectKey{Name: GetDebtName(account.Name), Namespace: r.accountSystemNamespace}, debt); client.IgnoreNotFound(err) != nil {
			return ctrl.Result{}, err
		} else if err != nil {
			if err := r.syncDebt(ctx, account, debt); err != nil {
				return ctrl.Result{}, err
			}
			r.Logger.Info("create or update debt success", "debt", debt)
		}
	} else if client.IgnoreNotFound(err) != nil {
		r.Logger.Error(err, err.Error())
		return ctrl.Result{}, err
	}

	if err := r.Get(ctx, req.NamespacedName, debt); err == nil {
		if debt.DeletionTimestamp != nil {
			return ctrl.Result{}, nil
		}
		if err := r.Get(ctx, types.NamespacedName{Name: debt.Spec.UserName, Namespace: r.accountNamespace}, account); err != nil {
			return ctrl.Result{}, err
		}
	} else if client.IgnoreNotFound(err) != nil {
		r.Logger.Error(err, err.Error())
		return ctrl.Result{}, err
	}

	if debt.Name == "" || account.Name == "" {
		r.Logger.Info("not get debt or not get account", "debt name", debt.Name, "account name", account.Name)
		return ctrl.Result{}, nil
	}
	// now should get debt and account
	//r.Logger.Info("debt info", "debt", debt)

	if err := r.reconcileDebtStatus(ctx, debt, account); err != nil {
		r.Logger.Error(err, "reconcile debt status error")
		return ctrl.Result{}, err
	}
	//Debt Detection Cycle
	return ctrl.Result{Requeue: true, RequeueAfter: r.DebtDetectionCycle}, nil
}

/*
NormalPeriod -> PreWarningPeriod -> WarningPeriod -> SuspendPeriod -> RemovedPeriod

Normal Period: The account balance is >=0 and the balance is >= estimated cost for next 30 days
PreWarning Period: The account balance is >= 0 and the balance is < estimated cost for next 30 days
Warning Period: The account balance is < 0
Suspended Period: The account balance is < 0 and the overdue days > DebtStatusDuration[accountv1.WarningPeriod] (default 3 days)
Removed Period: The account balance is < 0 and the overdue days > DebtStatusDuration[accountv1.SuspendPeriod] (default 15 days)

The total cycle from overdue to full removal = 15 days
*/

func initDebtConfigs() {
	// The duration of the debt status
	DebtStatusDuration[accountv1.WarningPeriod] = utils.GetIntEnvWithDefault(string(accountv1.WarningPeriod), 3*accountv1.DaySecond)
	DebtStatusDuration[accountv1.SuspendPeriod] = utils.GetIntEnvWithDefault(string(accountv1.SuspendPeriod), 15*accountv1.DaySecond)
	// The interval between debt notices
	DebtNoticeInterval[accountv1.PreWarningPeriod] = utils.GetIntEnvWithDefault(string(accountv1.PreWarningPeriod), 1*accountv1.DaySecond)
	DebtNoticeInterval[accountv1.WarningPeriod] = utils.GetIntEnvWithDefault(string(accountv1.WarningPeriod), 1*accountv1.DaySecond)
	DebtNoticeInterval[accountv1.SuspendPeriod] = utils.GetIntEnvWithDefault(string(accountv1.SuspendPeriod), 1*accountv1.DaySecond)
	// The contents of the text of the debt notice
	DebtNoticeText[accountv1.NormalPeriod] = "Your account is in good standing with sufficient balance."
	DebtNoticeText[accountv1.PreWarningPeriod] = "Your account balance may not be sufficient to cover the estimated charges for the next 30 days. " +
		"Please review your bill and consider recharging it."
	DebtNoticeText[accountv1.WarningPeriod] = "Your account balance is insufficient to cover current charges and your services will be suspended in 3 days. " +
		"Please review your bill and consider recharging it."
	DebtNoticeText[accountv1.SuspendPeriod] = "Your account balance is insufficient to cover current charges and your services will be removed in 15 days. " +
		"Please review your bill and consider recharging it."
	DebtNoticeText[accountv1.RemovedPeriod] = "Your resource has been removed due to insufficient balance."
}

func (r *DebtReconciler) reconcileDebtStatus(ctx context.Context, debt *accountv1.Debt, account *accountv1.Account) error {
	oweamount := account.Status.Balance - account.Status.DeductionBalance
	now := time.Now().UTC().Unix()
	statusIntervalSeconds := now - debt.Status.LastStatusTimestamp
	noticeIntervalSeconds := now - debt.Status.LastNoticeTimestamp
	userNamespace := GetUserNamespace(account.Name)

	oldStatusConversion(debt)

	switch debt.Status.AccountDebtStatus {
	case accountv1.NormalPeriod:
		if oweamount >= 0 {
			if ok, err := r.estimateSufficientFunds(ctx, userNamespace, oweamount); err != nil {
				r.Logger.Error(err, "estimate sufficient funds error")
			} else if !ok {
				if err := r.updateDebtAndNotify(ctx, debt, accountv1.PreWarningPeriod, userNamespace); err != nil {
					r.Logger.Error(err, "update debt status and notify error")
				}
			}
		} else {
			if err := r.updateDebtAndNotify(ctx, debt, accountv1.WarningPeriod, userNamespace); err != nil {
				r.Logger.Error(err, "update debt status and notify error")
			}
		}
	case accountv1.PreWarningPeriod:
		if oweamount >= 0 {
			if ok, err := r.estimateSufficientFunds(ctx, userNamespace, oweamount); err != nil {
				r.Logger.Error(err, "estimate sufficient funds error")
			} else if !ok {
				if noticeIntervalSeconds > DebtNoticeInterval[accountv1.PreWarningPeriod] {
					if err := r.notify(ctx, debt, accountv1.PreWarningPeriod, userNamespace); err != nil {
						r.Logger.Error(err, "notify error")
					}
				}
			} else {
				if err := r.updateDebtAndNotify(ctx, debt, accountv1.NormalPeriod, userNamespace); err != nil {
					r.Logger.Error(err, "update debt status and notify error")
				}
			}
		} else {
			if err := r.updateDebtAndNotify(ctx, debt, accountv1.WarningPeriod, userNamespace); err != nil {
				r.Logger.Error(err, "update debt status and notify error")
			}
		}
	case accountv1.WarningPeriod:
		if oweamount >= 0 {
			if ok, err := r.estimateSufficientFunds(ctx, userNamespace, oweamount); err != nil {
				r.Logger.Error(err, "estimate sufficient funds error")
			} else if ok {
				if err := r.updateDebtAndNotify(ctx, debt, accountv1.NormalPeriod, userNamespace); err != nil {
					r.Logger.Error(err, "update debt status and notify error")
				}
			} else {
				if err := r.updateDebtAndNotify(ctx, debt, accountv1.PreWarningPeriod, userNamespace); err != nil {
					r.Logger.Error(err, "update debt status and notify error")
				}
			}
		} else {
			if statusIntervalSeconds > DebtStatusDuration[accountv1.WarningPeriod] {
				if err := r.updateDebtAndNotify(ctx, debt, accountv1.SuspendPeriod, userNamespace); err != nil {
					r.Logger.Error(err, "update debt status and notify error")
				}
				if err := r.SuspendUserResource(ctx, userNamespace); err != nil {
					r.Logger.Error(err, "suspend user resource error")
				}
			} else if noticeIntervalSeconds > DebtNoticeInterval[accountv1.WarningPeriod] {
				if err := r.notify(ctx, debt, accountv1.WarningPeriod, userNamespace); err != nil {
					r.Logger.Error(err, "notify error")
				}
			}
		}
	case accountv1.SuspendPeriod:
		if oweamount >= 0 {
			if ok, err := r.estimateSufficientFunds(ctx, userNamespace, oweamount); err != nil {
				r.Logger.Error(err, "estimate sufficient funds error")
			} else if ok {
				if err := r.updateDebtAndNotify(ctx, debt, accountv1.NormalPeriod, userNamespace); err != nil {
					r.Logger.Error(err, "update debt status and notify error")
				}
			} else {
				if err := r.updateDebtAndNotify(ctx, debt, accountv1.PreWarningPeriod, userNamespace); err != nil {
					r.Logger.Error(err, "update debt status and notify error")
				}
			}
			if err := r.ResumeUserResource(ctx, userNamespace); err != nil {
				r.Logger.Error(err, "resume user resource error")
			}
		} else {
			if statusIntervalSeconds > DebtStatusDuration[accountv1.SuspendPeriod] {
				if err := r.updateDebtAndNotify(ctx, debt, accountv1.RemovedPeriod, userNamespace); err != nil {
					r.Logger.Info("change debt status and notify error")
				}
				// todo remove the user resource
			} else if noticeIntervalSeconds > DebtNoticeInterval[accountv1.SuspendPeriod] {
				if err := r.notify(ctx, debt, accountv1.SuspendPeriod, userNamespace); err != nil {
					r.Logger.Error(err, "notify error")
				}
			}
		}
	case accountv1.RemovedPeriod:
		if oweamount >= 0 {
			if ok, err := r.estimateSufficientFunds(ctx, userNamespace, oweamount); err != nil {
				r.Logger.Error(err, "estimate sufficient funds error")
			} else if ok {
				if err := r.updateDebtAndNotify(ctx, debt, accountv1.NormalPeriod, userNamespace); err != nil {
					r.Logger.Error(err, "update debt status and notify error")
				}
			} else {
				if err := r.updateDebtAndNotify(ctx, debt, accountv1.PreWarningPeriod, userNamespace); err != nil {
					r.Logger.Error(err, "update debt status and notify error")
				}
			}
			// Because there is no real deletion, it needs to be restored.
			if err := r.ResumeUserResource(ctx, userNamespace); err != nil {
				r.Logger.Error(err, "resume user resource error")
			}
		}
	default:
		return fmt.Errorf("AccountDebtStatus %s does not exist", debt.Status.AccountDebtStatus)
	}
	return nil
}

func (r *DebtReconciler) updateDebtAndNotify(ctx context.Context, debt *accountv1.Debt, newStatus accountv1.DebtStatusType, userNamespace string) error {
	if err := r.updateDebtStatus(ctx, debt, newStatus); err != nil {
		return err
	}
	return r.notify(ctx, debt, newStatus, userNamespace)
}

func (r *DebtReconciler) updateDebtStatus(ctx context.Context, debt *accountv1.Debt, newStatus accountv1.DebtStatusType) error {
	debt.Status.LastStatusTimestamp = time.Now().UTC().Unix()
	debt.Status.AccountDebtStatus = newStatus
	return r.Status().Update(ctx, debt)
}

func (r *DebtReconciler) notify(ctx context.Context, debt *accountv1.Debt, newStatus accountv1.DebtStatusType, userNamespace string) error {
	if err := r.sendNotice(ctx, userNamespace, newStatus); err != nil {
		return err
	}
	debt.Status.LastNoticeTimestamp = time.Now().UTC().Unix()
	return r.Status().Update(ctx, debt)
}

func (r *DebtReconciler) sendNotice(ctx context.Context, userNamespace string, newStatus accountv1.DebtStatusType) error {
	now := time.Now().UTC().Unix()
	ntf := v1.Notification{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "debt-notice-" + generateRandomID(),
			Namespace: userNamespace,
			Labels:    map[string]string{"isRead": "false"},
		},
		Spec: v1.NotificationSpec{
			Title:      "Debt Notice",
			Message:    DebtNoticeText[newStatus],
			Timestamp:  now,
			From:       "Debt-System",
			Importance: v1.High,
		},
	}
	_, err := controllerutil.CreateOrUpdate(ctx, r.Client, &ntf, func() error {
		ntf.ObjectMeta.Labels["isRead"] = "false"
		ntf.Spec.Message = DebtNoticeText[newStatus]
		ntf.Spec.Timestamp = now
		return nil
	})
	return err
}

func generateRandomID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}

// todo maybe will consider adding dynamic configuration later
var estimatedCostDays int64 = 30

func (r *DebtReconciler) estimateSufficientFunds(ctx context.Context, userNamespace string, oweamount int64) (bool, error) {
	MongoDBURI := os.Getenv(database.MongoURL)
	if MongoDBURI == "" {
		return false, fmt.Errorf("mongo url is empty")
	}
	dbCtx := context.Background()
	dbClient, err := database.NewMongoDB(dbCtx, MongoDBURI)
	if err != nil {
		return false, fmt.Errorf("connect mongo client failed")
	}
	defer func() {
		err := dbClient.Disconnect(ctx)
		if err != nil {
			r.Logger.V(5).Info("disconnect mongo client failed", "err", err)
		}
	}()

	billingRecordQuery := buildBillingRecordQuery(userNamespace)

	err = dbClient.QueryBillingRecords(billingRecordQuery, getUsername(billingRecordQuery.Namespace))
	if err != nil {
		return false, fmt.Errorf("query billing records failed")
	}

	if billingRecordQuery.Status.Items == nil || len(billingRecordQuery.Status.Items) == 0 {
		return false, fmt.Errorf("accountbalance in billing records of %s is empty", userNamespace)
	}
	expectedCost := billingRecordQuery.Status.Items[0].Amount * 24 * estimatedCostDays
	return oweamount >= expectedCost, nil
}

func buildBillingRecordQuery(userNamespace string) *accountv1.BillingRecordQuery {
	billingRecordQuery := &accountv1.BillingRecordQuery{}
	billingRecordQuery.Name = "estimateSufficientFunds"
	billingRecordQuery.Namespace = userNamespace
	billingRecordQuery.Spec.EndTime = metav1.Time{Time: time.Now()}
	oneMonthAgo := billingRecordQuery.Spec.EndTime.Time.AddDate(0, -1, 0)
	billingRecordQuery.Spec.StartTime = metav1.Time{Time: oneMonthAgo}
	billingRecordQuery.Spec.Page = 1
	billingRecordQuery.Spec.PageSize = 10
	billingRecordQuery.Spec.Type = -1
	return billingRecordQuery
}

// 旧版本转换
func oldStatusConversion(debt *accountv1.Debt) {
	switch debt.Status.AccountDebtStatus {
	case accountv1.DebtStatusNormal:
		debt.Status.AccountDebtStatus = accountv1.NormalPeriod
	case accountv1.ApproachingDeletionPeriod:
		debt.Status.AccountDebtStatus = accountv1.WarningPeriod
	case accountv1.ImminentDeletionPeriod:
		debt.Status.AccountDebtStatus = accountv1.WarningPeriod
	case accountv1.FinalDeletionPeriod:
		debt.Status.AccountDebtStatus = accountv1.RemovedPeriod
	}
}

func (r *DebtReconciler) syncDebt(ctx context.Context, account *accountv1.Account, debt *accountv1.Debt) error {
	debt.Name = GetDebtName(account.Name)
	debt.Namespace = r.accountSystemNamespace
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, debt, func() error {
		debt.Spec.UserName = account.Name
		return nil
	}); err != nil {
		return err
	}
	return nil
}

func GetDebtName(AccountName string) string {
	return fmt.Sprintf("%s%s", accountv1.DebtPrefix, AccountName)
}

func GetUserNamespace(AccountName string) string {
	return "ns-" + AccountName
}

func (r *DebtReconciler) SuspendUserResource(ctx context.Context, namespace string) error {
	return r.updateNamespaceStatus(ctx, namespace, accountv1.SuspendDebtNamespaceAnnoStatus)
}

func (r *DebtReconciler) ResumeUserResource(ctx context.Context, namespace string) error {
	return r.updateNamespaceStatus(ctx, namespace, accountv1.ResumeDebtNamespaceAnnoStatus)
}

func (r *DebtReconciler) updateNamespaceStatus(ctx context.Context, namespace, status string) error {
	ns := &corev1.Namespace{}
	err := r.Get(ctx, types.NamespacedName{Name: namespace, Namespace: r.accountSystemNamespace}, ns)
	if err != nil {
		return err
	}
	// 交给namespace controller处理
	ns.Annotations[accountv1.DebtNamespaceAnnoStatusKey] = status
	return r.Client.Update(ctx, ns)
}

// SetupWithManager sets up the controller with the Manager.
func (r *DebtReconciler) SetupWithManager(mgr ctrl.Manager, rateOpts controller.Options) error {
	r.Logger = ctrl.Log.WithName("DebtController")
	r.accountSystemNamespace = utils.GetEnvWithDefault(accountv1.AccountSystemNamespaceEnv, "account-system")
	r.accountNamespace = utils.GetEnvWithDefault(ACCOUNTNAMESPACEENV, "sealos-system")
	debtDetectionCycleSecond := utils.GetIntEnvWithDefault(DebtDetectionCycleEnv, 30)
	r.DebtDetectionCycle = time.Duration(debtDetectionCycleSecond) * time.Second
	initDebtConfigs()

	r.Logger.Info("set config", "DebtStatusDuration", DebtStatusDuration, "DebtNoticeInterval", DebtNoticeInterval,
		"accountSystemNamespace", r.accountSystemNamespace, "accountNamespace", r.accountNamespace)
	return ctrl.NewControllerManagedBy(mgr).
		// update status should not enter reconcile
		For(&accountv1.Account{}, builder.WithPredicates(OnlyCreatePredicate{})).
		WithOptions(rateOpts).
		Complete(r)
}

type OnlyCreatePredicate struct {
	predicate.Funcs
}

func (OnlyCreatePredicate) Update(_ event.UpdateEvent) bool {
	return false
}

func (OnlyCreatePredicate) Create(_ event.CreateEvent) bool {
	return true
}
