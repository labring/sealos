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
	"strconv"
	"time"

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

var DebtConfig = accountv1.DefaultDebtConfig

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
NormalPeriod -> WarningPeriod -> ApproachingDeletionPeriod -> ImmediateDeletePeriod -> FinalDeletePeriod
正常期：账户余额大于等于0
预警期：账户余额小于0时,且超时超过WarningPeriodSeconds (default is 0 day)
临近删除期：账户余额小于0，且上次更新时间超过ApproachingDeletionPeriodSeconds (default is 4 days)
即刻删除期：账户余额小于0，且上次更新时间超过ImmediateDeletePeriodSeconds (default is 3 days)
最终删除期：账户余额小于0，且上次更新时间超过FinalDeletePeriodSeconds (default is 7 days)

欠费后到完全删除的总周期=WarningPeriodSeconds+ApproachingDeletionPeriodSeconds+ImmediateDeletePeriodSeconds+FinalDeletePeriodSeconds
*/
func (r *DebtReconciler) reconcileDebtStatus(ctx context.Context, debt *accountv1.Debt, account *accountv1.Account) error {
	oweamount := account.Status.Balance - account.Status.DeductionBalance
	//更新间隔秒钟数
	updateIntervalSeconds := time.Now().UTC().Unix() - debt.Status.LastUpdateTimestamp
	lastStatus := debt.Status
	userNamespace := GetUserNamespace(account.Name)
	update := false

	// 判断上次状态到当前的状态
	switch lastStatus.AccountDebtStatus {
	case accountv1.NormalPeriod:
		/*
			余额大于等于0:
			  正常期 -> 正常期: 无操作返回
			余额小于0:
			  正常期 -> 警告期: 更新status 状态warning事件及更新事件，并发送警告消息通知
		*/
		if oweamount >= 0 {
			return nil
		}
		update = SetDebtStatus(debt, accountv1.WarningPeriod)
		if err := r.sendWarningNotice(ctx, userNamespace); err != nil {
			r.Logger.Error(err, "send warning notice error")
		}
	case accountv1.WarningPeriod:
		/*
			余额大于等于0：
			  警告期 -> 正常期：更新status 状态normal事件及更新时间，撤销warning消息通知
			余额小于0：
			上次更新时间小于临近删除时间, 且欠费小于总金额的一半：
			  警告期 -> 警告期：无操作返回
			else：
			  警告期 -> 临近删除期： 更新status 状态approachingDeletion事件及更新时间，发送临近删除消息通知
		*/
		if oweamount >= 0 {
			update = SetDebtStatus(debt, accountv1.NormalPeriod)
			//TODO 撤销警告消息通知
			break
		}
		//上次更新时间小于临近删除时间
		if updateIntervalSeconds < DebtConfig[accountv1.ApproachingDeletionPeriod] && (account.Status.Balance/2)+oweamount > 0 {
			return nil
		}
		update = SetDebtStatus(debt, accountv1.ApproachingDeletionPeriod)
		if err := r.sendApproachingDeletionNotice(ctx, userNamespace); err != nil {
			r.Logger.Error(err, "sendApproachingDeletionNotice error")
		}

	case accountv1.ApproachingDeletionPeriod:
		/*
			余额大于0：
			  临近删除期 -> 正常期：更新status 状态normal事件及更新时间，撤销临近删除消息通知
			余额大于0：
			上次更新时间小于最终删除时间，且欠费不大于总金额：
			  临近删除期 -> 临近删除期：无操作返回
			else：
			  临近删除期 -> 即刻删除期： 执行暂停用户资源，更新status 状态imminentDeletionPeriod事件及更新时间，发送最终删除消息通知
		*/
		if oweamount >= 0 {
			update = SetDebtStatus(debt, accountv1.NormalPeriod)
			//TODO 撤销临近删除消息通知
			break
		}
		if updateIntervalSeconds < DebtConfig[accountv1.ImminentDeletionPeriod] && account.Status.Balance+oweamount > 0 {
			return nil
		}
		update = SetDebtStatus(debt, accountv1.ImminentDeletionPeriod)
		if err := r.sendImminentDeletionNotice(ctx, userNamespace); err != nil {
			r.Logger.Error(err, "sendImminentDeletionNotice error")
		}
		if err := r.SuspendUserResource(ctx, userNamespace); err != nil {
			return err
		}
	case accountv1.ImminentDeletionPeriod:
		/*
			余额大于0：
			  即刻删除期 -> 正常期：恢复用户资源，更新status 状态normal事件及更新时间，撤销最终删除消息通知
			上次更新时间小于最终删除时间：
			  即刻删除期 -> 即刻删除期：无操作返回
			else：
			  即刻删除期 -> 最终删除期： 删除用户全部资源，更新status 状态finalDeletionPeriod事件及更新时间。发生最终删除消息通知
		*/
		if oweamount >= 0 {
			update = SetDebtStatus(debt, accountv1.NormalPeriod)
			// 恢复用户资源
			if err := r.ResumeUserResource(ctx, userNamespace); err != nil {
				return err
			}
			//TODO 撤销最终删除消息通知
			break
		}
		//上次更新时间小于最终删除时间, 且欠费不大于总金额的两倍
		if updateIntervalSeconds < DebtConfig[accountv1.FinalDeletionPeriod] {
			return nil
		}
		// TODO 暂时只暂停资源，后续会添加真正删除全部资源逻辑, 或直接删除namespace
		update = SetDebtStatus(debt, accountv1.FinalDeletionPeriod)
		if err := r.sendFinalDeletionNotice(ctx, userNamespace); err != nil {
			r.Error(err, "sendFinalDeletionNotice error")
		}
		if err := r.SuspendUserResource(ctx, userNamespace); err != nil {
			return err
		}
	case accountv1.FinalDeletionPeriod:
		/*
			余额大于0：
			  最终删除期 -> 正常期：更新status 状态normal事件及更新时间
		*/
		if oweamount >= 0 {
			//TODO 用户从欠费到正常，是否需要发送消息通知
			update = SetDebtStatus(debt, accountv1.NormalPeriod)

			// TODO 暂时非真正完全删除，仍可恢复用户资源，后续会添加真正删除全部资源逻辑，不在执行恢复逻辑
			if err := r.ResumeUserResource(ctx, userNamespace); err != nil {
				return err
			}
			break
		}
		if err := r.SuspendUserResource(ctx, userNamespace); err != nil {
			return err
		}
	//兼容老版本
	default:
		update = newStatusConversion(debt)
	}

	if update {
		r.Logger.Info("update debt status", "account", account.Name,
			"last status", lastStatus, "last update time", time.Unix(debt.Status.LastUpdateTimestamp, 0).Format(time.RFC3339),
			"current status", debt.Status.AccountDebtStatus, "time", time.Now().UTC().Format(time.RFC3339))
		return r.Status().Update(ctx, debt)
	}
	return nil
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

func SetDebtStatus(debt *accountv1.Debt, status accountv1.DebtStatusType) bool {
	debt.Status.AccountDebtStatus = status
	debt.Status.LastUpdateTimestamp = time.Now().UTC().Unix()
	return true
}

func newStatusConversion(debt *accountv1.Debt) bool {
	switch debt.Status.AccountDebtStatus {
	case accountv1.PreWarningPeriod:
		debt.Status.AccountDebtStatus = accountv1.NormalPeriod
	case accountv1.SuspendPeriod:
		debt.Status.AccountDebtStatus = accountv1.ImminentDeletionPeriod
	case accountv1.RemovedPeriod:
		debt.Status.AccountDebtStatus = accountv1.FinalDeletionPeriod
	default:
		debt.Status.AccountDebtStatus = accountv1.NormalPeriod
	}
	return true
}

func GetDebtName(AccountName string) string {
	return fmt.Sprintf("%s%s", accountv1.DebtPrefix, AccountName)
}

func GetUserNamespace(AccountName string) string {
	return "ns-" + AccountName
}

const (
	WarningNotice = iota
	ApproachingDeletionNotice
	ImminentDeletionNotice
	FinalDeletionNotice
)

var NoticeTemplate = map[int]string{
	WarningNotice:             "Your account balance is not enough to pay this month's bill, and services will be suspended for you. Please recharge in time to avoid affecting your normal use.",
	ApproachingDeletionNotice: "Your account balance is not enough to pay this month's bill. The system will delete your resources after three days or after the arrears exceed the recharge amount. Please recharge in time to avoid affecting your normal use.",
	ImminentDeletionNotice:    "Your container instance resources have been suspended. If you are still in arrears for more than 7 days, the resources will be completely deleted and cannot be recovered. Please recharge in time to avoid affecting your normal use.",
	FinalDeletionNotice:       "The system has completely deleted all your resources, please recharge in time to avoid affecting your normal use.",
}

func (r *DebtReconciler) sendNotice(ctx context.Context, namespace string, noticeType int) error {
	now := time.Now().UTC().Unix()
	ntf := v1.Notification{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "debt-notice" + strconv.Itoa(noticeType),
			Namespace: namespace,
		},
		Spec: v1.NotificationSpec{
			Title:      "Debt Notice",
			Message:    NoticeTemplate[noticeType],
			From:       "Debt-System",
			Importance: v1.High,
		},
	}
	_, err := controllerutil.CreateOrUpdate(ctx, r.Client, &ntf, func() error {
		ntf.Spec.Timestamp = now
		return nil
	})
	return err
}

func (r *DebtReconciler) sendWarningNotice(ctx context.Context, namespace string) error {
	return r.sendNotice(ctx, namespace, WarningNotice)
}

func (r *DebtReconciler) sendApproachingDeletionNotice(ctx context.Context, namespace string) error {
	return r.sendNotice(ctx, namespace, ApproachingDeletionNotice)
}

func (r *DebtReconciler) sendImminentDeletionNotice(ctx context.Context, namespace string) error {
	return r.sendNotice(ctx, namespace, ImminentDeletionNotice)
}

func (r *DebtReconciler) sendFinalDeletionNotice(ctx context.Context, namespace string) error {
	return r.sendNotice(ctx, namespace, FinalDeletionNotice)
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
	setDefaultDebtPeriodWaitSecond()
	debtDetectionCycleSecond := utils.GetIntEnvWithDefault(DebtDetectionCycleEnv, 60)
	r.DebtDetectionCycle = time.Duration(debtDetectionCycleSecond) * time.Second

	/*
		{"DebtConfig":{
		"ApproachingDeletionPeriod":345600,
		"FinalDeletionPeriod":604800,
		"ImminentDeletionPeriod":259200,"WarningPeriod":0},
		"DebtDetectionCycle": "1m0s",
		"accountSystemNamespace": "account-system",
		"accountNamespace": "sealos-system"}
	*/
	r.Logger.Info("set config", "DebtConfig", DebtConfig, "DebtDetectionCycle", r.DebtDetectionCycle,
		"accountSystemNamespace", r.accountSystemNamespace, "accountNamespace", r.accountNamespace)
	return ctrl.NewControllerManagedBy(mgr).
		// update status should not enter reconcile
		For(&accountv1.Account{}, builder.WithPredicates(OnlyCreatePredicate{})).
		WithOptions(rateOpts).
		Complete(r)
}

func setDefaultDebtPeriodWaitSecond() {
	/*
		WarningPeriod:             WarnPeriodWaitSecond,
		ApproachingDeletionPeriod: ApproachingDeletionPeriodWaitSecond,
		ImminentDeletionPeriod:    IminentDeletionPeriodWaitSecond,
		FinalDeletionPeriod:       FinalDeletionPeriodWaitSecond,
	*/
	DebtConfig[accountv1.WarningPeriod] = utils.GetIntEnvWithDefault(string(accountv1.WarningPeriod), 0*accountv1.DaySecond)
	DebtConfig[accountv1.ApproachingDeletionPeriod] = utils.GetIntEnvWithDefault(string(accountv1.ApproachingDeletionPeriod), 4*accountv1.DaySecond)
	DebtConfig[accountv1.ImminentDeletionPeriod] = utils.GetIntEnvWithDefault(string(accountv1.ImminentDeletionPeriod), 3*accountv1.DaySecond)
	DebtConfig[accountv1.FinalDeletionPeriod] = utils.GetIntEnvWithDefault(string(accountv1.FinalDeletionPeriod), 7*accountv1.DaySecond)
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
