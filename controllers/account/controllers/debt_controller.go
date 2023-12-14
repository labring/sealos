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
	"math"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/alibabacloud-go/tea/tea"

	"github.com/labring/sealos/controllers/pkg/database"

	client2 "github.com/alibabacloud-go/dysmsapi-20170525/v3/client"

	"github.com/labring/sealos/controllers/account/controllers/utils"

	"github.com/go-logr/logr"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	v1 "github.com/labring/sealos/controllers/pkg/notification/api/v1"
	"github.com/labring/sealos/controllers/pkg/utils/env"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

const (
	DebtDetectionCycleEnv = "DebtDetectionCycleSeconds"

	SMSAccessKeyIDEnv     = "SMS_AK"
	SMSAccessKeySecretEnv = "SMS_SK"
	SMSEndpointEnv        = "SMS_ENDPOINT"
	SMSSignNameEnv        = "SMS_SIGN_NAME"
	SMSCodeMapEnv         = "SMS_CODE_MAP"
)

// DebtReconciler reconciles a Debt object
type DebtReconciler struct {
	client.Client
	DBClient           database.Auth
	Scheme             *runtime.Scheme
	DebtDetectionCycle time.Duration
	logr.Logger
	accountSystemNamespace string
	accountNamespace       string
	SmsConfig              *SmsConfig
}

type SmsConfig struct {
	Client      *client2.Client
	SmsSignName string
	SmsCode     map[int]string
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

	nsList, err := getOwnNsList(r.Client, getUsername(account.Name))
	if err != nil {
		r.Logger.Error(err, "get own ns list error")
		return ctrl.Result{}, fmt.Errorf("get own ns list error: %v", err)
	}
	if err := r.reconcileDebtStatus(ctx, debt, account, nsList); err != nil {
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
func (r *DebtReconciler) reconcileDebtStatus(ctx context.Context, debt *accountv1.Debt, account *accountv1.Account, userNamespaceList []string) error {
	oweamount := account.Status.Balance - account.Status.DeductionBalance
	//更新间隔秒钟数
	updateIntervalSeconds := time.Now().UTC().Unix() - debt.Status.LastUpdateTimestamp
	lastStatus := debt.Status
	//userNamespace := GetUserNamespace(account.Name)
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
		if err := r.sendWarningNotice(ctx, debt.Spec.UserName, oweamount, userNamespaceList); err != nil {
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
		if err := r.sendApproachingDeletionNotice(ctx, debt.Spec.UserName, oweamount, userNamespaceList); err != nil {
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
		if err := r.sendImminentDeletionNotice(ctx, debt.Spec.UserName, oweamount, userNamespaceList); err != nil {
			r.Logger.Error(err, "sendImminentDeletionNotice error")
		}
		if err := r.SuspendUserResource(ctx, userNamespaceList); err != nil {
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
			if err := r.ResumeUserResource(ctx, userNamespaceList); err != nil {
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
		if err := r.sendFinalDeletionNotice(ctx, debt.Spec.UserName, oweamount, userNamespaceList); err != nil {
			r.Error(err, "sendFinalDeletionNotice error")
		}
		if err := r.SuspendUserResource(ctx, userNamespaceList); err != nil {
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
			if err := r.ResumeUserResource(ctx, userNamespaceList); err != nil {
				return err
			}
			break
		}
		if err := r.SuspendUserResource(ctx, userNamespaceList); err != nil {
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

const (
	fromEn = "Debt-System"
	fromZh = "欠费系统"
	//languageEn = "en"
	languageZh       = "zh"
	debtChoicePrefix = "debt-choice-"
	readStatusLabel  = "isRead"
	falseStatus      = "false"
)

var NoticeTemplateEN = map[int]string{
	WarningNotice:             "Your account balance is not enough to pay this month's bill, and services will be suspended for you. Please recharge in time to avoid affecting your normal use.",
	ApproachingDeletionNotice: "Your account balance is not enough to pay this month's bill. The system will delete your resources after three days or after the arrears exceed the recharge amount. Please recharge in time to avoid affecting your normal use.",
	ImminentDeletionNotice:    "Your container instance resources have been suspended. If you are still in arrears for more than 7 days, the resources will be completely deleted and cannot be recovered. Please recharge in time to avoid affecting your normal use.",
	FinalDeletionNotice:       "The system has completely deleted all your resources, please recharge in time to avoid affecting your normal use.",
}

var TitleTemplateZH = map[int]string{
	WarningNotice:             "欠费告警",
	ApproachingDeletionNotice: "资源暂停告警",
	ImminentDeletionNotice:    "资源释放告警",
	FinalDeletionNotice:       "资源已释放告警",
}

var TitleTemplateEN = map[int]string{
	WarningNotice:             "Debt Warning",
	ApproachingDeletionNotice: "Resource Suspension Warning",
	ImminentDeletionNotice:    "Resource Release Warning",
	FinalDeletionNotice:       "Resource Release Warning",
}

var NoticeTemplateZH = map[int]string{
	WarningNotice:             "您的账户余额不足，系统将为您暂停服务，请及时充值，以免影响您的正常使用。",
	ApproachingDeletionNotice: "您的账户余额不足，系统将在三天后或欠费超过充值金额后释放您的资源，请及时充值，以免影响您的正常使用。",
	ImminentDeletionNotice:    "您的容器实例资源已被暂停，若您仍欠费超过7天，系统将彻底释放资源，无法恢复，请及时充值，以免影响您的正常使用。",
	FinalDeletionNotice:       "系统已彻底释放您的所有资源，请及时充值，以免影响您的正常使用。",
}

func (r *DebtReconciler) sendSMSNotice(user string, oweAmount int64, noticeType int) error {
	if r.SmsConfig == nil {
		return nil
	}
	// TODO send sms
	usr, err := r.DBClient.GetUser(user)
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}
	if usr == nil || usr.Phone == "" {
		r.Logger.Info("user not exist or user phone is empty, skip sms notification", "user", user)
		return nil
	}
	oweamount := strconv.FormatInt(int64(math.Abs(math.Ceil(float64(oweAmount)/1_000_000))), 10)
	return utils.SendSms(r.SmsConfig.Client, &client2.SendSmsRequest{
		PhoneNumbers: tea.String(usr.Phone),
		SignName:     tea.String(r.SmsConfig.SmsSignName),
		TemplateCode: tea.String(r.SmsConfig.SmsCode[noticeType]),
		// ｜ownAmount/1_000_000｜
		TemplateParam: tea.String("{\"user_id\":\"" + user + "\",\"oweamount\":\"" + oweamount + "\"}"),
	})
}

func (r *DebtReconciler) sendNotice(ctx context.Context, user string, oweAmount int64, noticeType int, namespaces []string) error {
	now := time.Now().UTC().Unix()
	ntfTmp := &v1.Notification{
		ObjectMeta: metav1.ObjectMeta{
			Name: debtChoicePrefix + strconv.Itoa(noticeType),
		},
	}
	ntfTmpSpc := v1.NotificationSpec{
		Title:        TitleTemplateEN[noticeType],
		Message:      NoticeTemplateEN[noticeType],
		From:         fromEn,
		Importance:   v1.High,
		DesktopPopup: true,
		Timestamp:    now,
		I18n: map[string]v1.I18n{
			languageZh: {
				Title:   TitleTemplateZH[noticeType],
				From:    fromZh,
				Message: NoticeTemplateZH[noticeType],
			},
		},
	}
	for i := range namespaces {
		ntf := ntfTmp.DeepCopy()
		ntfSpec := ntfTmpSpc.DeepCopy()
		ntf.Namespace = namespaces[i]
		if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, ntf, func() error {
			ntf.Spec = *ntfSpec
			if ntf.Labels == nil {
				ntf.Labels = make(map[string]string)
			}
			ntf.Labels[readStatusLabel] = falseStatus
			return nil
		}); err != nil {
			return err
		}
	}
	return r.sendSMSNotice(user, oweAmount, noticeType)
}

func (r *DebtReconciler) sendWarningNotice(ctx context.Context, user string, oweAmount int64, namespaces []string) error {
	return r.sendNotice(ctx, user, oweAmount, WarningNotice, namespaces)
}

func (r *DebtReconciler) sendApproachingDeletionNotice(ctx context.Context, user string, oweAmount int64, namespaces []string) error {
	return r.sendNotice(ctx, user, oweAmount, ApproachingDeletionNotice, namespaces)
}

func (r *DebtReconciler) sendImminentDeletionNotice(ctx context.Context, user string, oweAmount int64, namespaces []string) error {
	return r.sendNotice(ctx, user, oweAmount, ImminentDeletionNotice, namespaces)
}

func (r *DebtReconciler) sendFinalDeletionNotice(ctx context.Context, user string, oweAmount int64, namespaces []string) error {
	return r.sendNotice(ctx, user, oweAmount, FinalDeletionNotice, namespaces)
}

func (r *DebtReconciler) SuspendUserResource(ctx context.Context, namespaces []string) error {
	return r.updateNamespaceStatus(ctx, accountv1.SuspendDebtNamespaceAnnoStatus, namespaces)
}

func (r *DebtReconciler) ResumeUserResource(ctx context.Context, namespaces []string) error {
	return r.updateNamespaceStatus(ctx, accountv1.ResumeDebtNamespaceAnnoStatus, namespaces)
}

func (r *DebtReconciler) updateNamespaceStatus(ctx context.Context, status string, namespaces []string) error {
	for i := range namespaces {
		ns := &corev1.Namespace{}
		if err := r.Get(ctx, types.NamespacedName{Name: namespaces[i], Namespace: r.accountSystemNamespace}, ns); err != nil {
			return err
		}
		// 交给namespace controller处理
		ns.Annotations[accountv1.DebtNamespaceAnnoStatusKey] = status
		if err := r.Client.Update(ctx, ns); err != nil {
			return err
		}
	}
	return nil
}

// convert "1:code1,2:code2" to map[int]string
func splitSmsCodeMap(codeStr string) (map[int]string, error) {
	codeMap := make(map[int]string)
	for _, code := range strings.Split(codeStr, ",") {
		split := strings.SplitN(code, ":", 2)
		if len(split) != 2 {
			return nil, fmt.Errorf("invalid sms code map: %s", codeStr)
		}
		codeInt, err := strconv.Atoi(split[0])
		if err != nil {
			return nil, fmt.Errorf("invalid sms code map: %s", codeStr)
		}
		codeMap[codeInt] = split[1]
	}
	return codeMap, nil
}

func setupSmsConfig() (*SmsConfig, error) {
	if err := env.CheckEnvSetting([]string{SMSAccessKeyIDEnv, SMSAccessKeySecretEnv, SMSEndpointEnv, SMSSignNameEnv, SMSCodeMapEnv}); err != nil {
		return nil, fmt.Errorf("check env setting error: %w", err)
	}

	smsCodeMap, err := splitSmsCodeMap(os.Getenv(SMSCodeMapEnv))
	if err != nil {
		return nil, fmt.Errorf("split sms code map error: %w", err)
	}

	smsClient, err := utils.CreateSMSClient(os.Getenv(SMSAccessKeyIDEnv), os.Getenv(SMSAccessKeySecretEnv), os.Getenv(SMSEndpointEnv))
	if err != nil {
		return nil, fmt.Errorf("create sms client error: %w", err)
	}

	return &SmsConfig{
		Client:      smsClient,
		SmsSignName: os.Getenv(SMSSignNameEnv),
		SmsCode:     smsCodeMap,
	}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *DebtReconciler) SetupWithManager(mgr ctrl.Manager, rateOpts controller.Options) error {
	r.Logger = ctrl.Log.WithName("DebtController")
	r.accountSystemNamespace = env.GetEnvWithDefault(accountv1.AccountSystemNamespaceEnv, "account-system")
	r.accountNamespace = env.GetEnvWithDefault(ACCOUNTNAMESPACEENV, "sealos-system")
	setDefaultDebtPeriodWaitSecond()
	debtDetectionCycleSecond := env.GetInt64EnvWithDefault(DebtDetectionCycleEnv, 60)
	r.DebtDetectionCycle = time.Duration(debtDetectionCycleSecond) * time.Second

	smsConfig, err := setupSmsConfig()
	if err != nil {
		r.Logger.Error(err, "Failed to set up SMS configuration")
	} else {
		r.SmsConfig = smsConfig
	}

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
	DebtConfig[accountv1.WarningPeriod] = env.GetInt64EnvWithDefault(string(accountv1.WarningPeriod), 0*accountv1.DaySecond)
	DebtConfig[accountv1.ApproachingDeletionPeriod] = env.GetInt64EnvWithDefault(string(accountv1.ApproachingDeletionPeriod), 4*accountv1.DaySecond)
	DebtConfig[accountv1.ImminentDeletionPeriod] = env.GetInt64EnvWithDefault(string(accountv1.ImminentDeletionPeriod), 3*accountv1.DaySecond)
	DebtConfig[accountv1.FinalDeletionPeriod] = env.GetInt64EnvWithDefault(string(accountv1.FinalDeletionPeriod), 7*accountv1.DaySecond)
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
