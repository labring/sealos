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
	"errors"
	"fmt"
	"math"
	"os"
	"reflect"
	runtime2 "runtime"
	"strconv"
	"strings"
	"time"

	"github.com/alibabacloud-go/tea/tea"

	"github.com/volcengine/volc-sdk-golang/service/vms"

	"github.com/labring/sealos/controllers/pkg/pay"

	"gorm.io/gorm"
	"sigs.k8s.io/controller-runtime/pkg/handler"

	"github.com/labring/sealos/controllers/pkg/database/cockroach"

	pkgtypes "github.com/labring/sealos/controllers/pkg/types"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"

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
	VmsAccessKeyIDEnv     = "VMS_AK"
	VmsAccessKeySecretEnv = "VMS_SK"
	SMSEndpointEnv        = "SMS_ENDPOINT"
	SMSSignNameEnv        = "SMS_SIGN_NAME"
	SMSCodeMapEnv         = "SMS_CODE_MAP"
	VmsCodeMapEnv         = "VMS_CODE_MAP"
	VmsNumberPollEnv      = "VMS_NUMBER_POLL"
	SMTPHostEnv           = "SMTP_HOST"
	SMTPPortEnv           = "SMTP_PORT"
	SMTPFromEnv           = "SMTP_FROM"
	SMTPPasswordEnv       = "SMTP_PASSWORD"
	SMTPTitleEnv          = "SMTP_TITLE"
)

// DebtReconciler reconciles a Debt object
type DebtReconciler struct {
	client.Client
	AccountV2          database.AccountV2
	Scheme             *runtime.Scheme
	DebtDetectionCycle time.Duration
	LocalRegionID      string
	logr.Logger
	accountSystemNamespace string
	SmsConfig              *SmsConfig
	VmsConfig              *VmsConfig
	smtpConfig             *utils.SMTPConfig
}

type VmsConfig struct {
	TemplateCode map[int]string
	NumberPoll   string
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
	payment := &accountv1.Payment{}
	var reconcileErr error
	if err := r.Get(ctx, client.ObjectKey{Namespace: req.Namespace, Name: req.Name}, payment); err == nil {
		if payment.Status.Status != pay.PaymentSuccess {
			return ctrl.Result{RequeueAfter: 10 * time.Second}, nil
		}
		reconcileErr = r.reconcile(ctx, payment.Spec.UserID)
	} else if client.IgnoreNotFound(err) != nil {
		return ctrl.Result{}, fmt.Errorf("failed to get payment %s: %v", req.Name, err)
	} else {
		reconcileErr = r.reconcile(ctx, req.NamespacedName.Name)
	}
	if reconcileErr != nil {
		if reconcileErr == ErrAccountNotExist {
			return ctrl.Result{RequeueAfter: 10 * time.Minute}, nil
		}
		r.Logger.Error(reconcileErr, "reconcile debt error")
		return ctrl.Result{}, reconcileErr
	}
	return ctrl.Result{RequeueAfter: r.DebtDetectionCycle}, nil
}

func (r *DebtReconciler) reconcile(ctx context.Context, owner string) error {
	debt := &accountv1.Debt{}
	account, err := r.AccountV2.GetAccount(&pkgtypes.UserQueryOpts{Owner: owner})
	if account == nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			userOwner := &userv1.User{}
			if err := r.Get(ctx, types.NamespacedName{Name: owner, Namespace: r.accountSystemNamespace}, userOwner); err != nil {
				// if user not exist, skip
				if client.IgnoreNotFound(err) == nil {
					return nil
				}
				return fmt.Errorf("failed to get user %s: %v", owner, err)
			}
			// if user not exist, skip
			if userOwner.CreationTimestamp.Add(20 * 24 * time.Hour).Before(time.Now()) {
				return nil
			}
		}
		r.Logger.Error(fmt.Errorf("account %s not exist", owner), err.Error())
		return ErrAccountNotExist
	}
	if account.CreateRegionID == "" {
		if err = r.AccountV2.SetAccountCreateLocalRegion(account, r.LocalRegionID); err != nil {
			return fmt.Errorf("failed to set account %s create region: %v", owner, err)
		}
	}
	// In a multi-region scenario, select the region where the account is created for SMS notification
	smsEnable := account.CreateRegionID == r.LocalRegionID

	//r.Logger.Info("reconcile debt", "account", owner, "balance", account.Balance, "deduction balance", account.DeductionBalance)
	if err := r.Get(ctx, client.ObjectKey{Name: GetDebtName(owner), Namespace: r.accountSystemNamespace}, debt); client.IgnoreNotFound(err) != nil {
		return err
	} else if err != nil {
		if err := r.syncDebt(ctx, owner, debt); err != nil {
			return err
		}
		//r.Logger.Info("create or update debt success", "debt", debt)
	}

	nsList, err := getOwnNsList(r.Client, getUsername(owner))
	if err != nil {
		r.Logger.Error(err, "get own ns list error")
		return fmt.Errorf("get own ns list error: %v", err)
	}
	if err := r.reconcileDebtStatus(ctx, debt, account, nsList, smsEnable); err != nil {
		r.Logger.Error(err, "reconcile debt status error")
		return err
	}
	return nil
}

var ErrAccountNotExist = errors.New("account not exist")

/*
NormalPeriod -> WarningPeriod -> ApproachingDeletionPeriod -> ImmediateDeletePeriod -> FinalDeletePeriod
正常期：账户余额大于等于0
预警期：账户余额小于0时,且超时超过WarningPeriodSeconds (default is 0 day)
临近删除期：账户余额小于0，且上次更新时间超过ApproachingDeletionPeriodSeconds (default is 4 days)
即刻删除期：账户余额小于0，且上次更新时间超过ImmediateDeletePeriodSeconds (default is 3 days)
最终删除期：账户余额小于0，且上次更新时间超过FinalDeletePeriodSeconds (default is 7 days)

欠费后到完全删除的总周期=WarningPeriodSeconds+ApproachingDeletionPeriodSeconds+ImmediateDeletePeriodSeconds+FinalDeletePeriodSeconds
*/
func (r *DebtReconciler) reconcileDebtStatus(ctx context.Context, debt *accountv1.Debt, account *pkgtypes.Account, userNamespaceList []string, smsEnable bool) error {
	oweamount := account.Balance - account.DeductionBalance
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
		update = SetDebtStatus(debt, accountv1.NormalPeriod, accountv1.WarningPeriod)
		if err := r.sendWarningNotice(ctx, debt.Spec.UserName, oweamount, userNamespaceList, smsEnable); err != nil {
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
			update = SetDebtStatus(debt, accountv1.WarningPeriod, accountv1.NormalPeriod)
			if err := r.readNotice(ctx, userNamespaceList, WarningNotice); err != nil {
				r.Logger.Error(err, "readNotice WarningNotice error")
			}
			break
		}
		//上次更新时间小于临近删除时间
		if updateIntervalSeconds < DebtConfig[accountv1.ApproachingDeletionPeriod] && (account.Balance/2)+oweamount > 0 {
			return nil
		}
		update = SetDebtStatus(debt, accountv1.WarningPeriod, accountv1.ApproachingDeletionPeriod)
		if err := r.sendApproachingDeletionNotice(ctx, debt.Spec.UserName, oweamount, userNamespaceList, smsEnable); err != nil {
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
			update = SetDebtStatus(debt, accountv1.ApproachingDeletionPeriod, accountv1.NormalPeriod)
			if err := r.readNotice(ctx, userNamespaceList, ApproachingDeletionNotice, WarningNotice); err != nil {
				r.Logger.Error(err, "readNotice ApproachingDeletionNotice error")
			}
			break
		}
		if updateIntervalSeconds < DebtConfig[accountv1.ImminentDeletionPeriod] && account.Balance+oweamount > 0 {
			return nil
		}
		update = SetDebtStatus(debt, accountv1.ApproachingDeletionPeriod, accountv1.ImminentDeletionPeriod)
		if err := r.sendImminentDeletionNotice(ctx, debt.Spec.UserName, oweamount, userNamespaceList, smsEnable); err != nil {
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
			update = SetDebtStatus(debt, accountv1.ImminentDeletionPeriod, accountv1.NormalPeriod)
			// 恢复用户资源
			if err := r.ResumeUserResource(ctx, userNamespaceList); err != nil {
				return err
			}
			if err := r.readNotice(ctx, userNamespaceList, ImminentDeletionNotice, ApproachingDeletionNotice, WarningNotice); err != nil {
				r.Logger.Error(err, "readNotice ImminentDeletionNotice error")
			}
			break
		}
		//上次更新时间小于最终删除时间, 且欠费不大于总金额的两倍
		if updateIntervalSeconds < DebtConfig[accountv1.FinalDeletionPeriod] {
			return nil
		}
		// TODO 暂时只暂停资源，后续会添加真正删除全部资源逻辑, 或直接删除namespace
		update = SetDebtStatus(debt, accountv1.ImminentDeletionPeriod, accountv1.FinalDeletionPeriod)
		if err := r.sendFinalDeletionNotice(ctx, debt.Spec.UserName, oweamount, userNamespaceList, smsEnable); err != nil {
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
			if err := r.readNotice(ctx, userNamespaceList, FinalDeletionNotice, ImminentDeletionNotice, ApproachingDeletionNotice, WarningNotice); err != nil {
				r.Logger.Error(err, "readNotice FinalDeletionNotice error")
			}
			//TODO 用户从欠费到正常，是否需要发送消息通知
			update = SetDebtStatus(debt, accountv1.FinalDeletionPeriod, accountv1.NormalPeriod)

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
		r.Logger.V(1).Info("update debt status", "account", debt.Spec.UserName,
			"last status", lastStatus, "last update time", time.Unix(debt.Status.LastUpdateTimestamp, 0).Format(time.RFC3339),
			"current status", debt.Status.AccountDebtStatus, "time", time.Now().UTC().Format(time.RFC3339))
		return r.Status().Update(ctx, debt)
	}
	return nil
}

func (r *DebtReconciler) syncDebt(ctx context.Context, owner string, debt *accountv1.Debt) error {
	debt.Name = GetDebtName(owner)
	debt.Namespace = r.accountSystemNamespace
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, debt, func() error {
		debt.Spec.UserName = owner
		return nil
	}); err != nil {
		return err
	}
	return nil
}

var MaxDebtHistoryStatusLength = env.GetIntEnvWithDefault("MAX_DEBT_HISTORY_STATUS_LENGTH", 10)

func SetDebtStatus(debt *accountv1.Debt, lastStatus, currentStatus accountv1.DebtStatusType) bool {
	debt.Status.AccountDebtStatus = currentStatus
	now := time.Now().UTC()
	debt.Status.LastUpdateTimestamp = now.Unix()
	length := len(debt.Status.DebtStatusRecords)
	statusRecord := accountv1.DebtStatusRecord{
		LastStatus:    lastStatus,
		CurrentStatus: currentStatus,
		UpdateTime:    metav1.NewTime(now),
	}
	if length == 0 {
		debt.Status.DebtStatusRecords = make([]accountv1.DebtStatusRecord, 0)
	} else if length == MaxDebtHistoryStatusLength {
		debt.Status.DebtStatusRecords = debt.Status.DebtStatusRecords[1:]
	}
	debt.Status.DebtStatusRecords = append(debt.Status.DebtStatusRecords, statusRecord)
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
	trueStatus       = "true"
)

var (
	TitleTemplateZH = map[int]string{
		WarningNotice:             "欠费告警",
		ApproachingDeletionNotice: "资源暂停告警",
		ImminentDeletionNotice:    "资源释放告警",
		FinalDeletionNotice:       "资源已释放告警",
	}
	TitleTemplateEN = map[int]string{
		WarningNotice:             "Debt Warning",
		ApproachingDeletionNotice: "Resource Suspension Warning",
		ImminentDeletionNotice:    "Resource Release Warning",
		FinalDeletionNotice:       "Resource Release Warning",
	}
)

var (
	EmailTemplateEN  map[int]string
	EmailTemplateZH  map[int]string
	NoticeTemplateEN map[int]string
	NoticeTemplateZH map[int]string
)

var (
	forbidTimes = []string{"00:00-10:00", "20:00-24:00"}
	UTCPlus8    = time.FixedZone("UTC+8", 8*3600)
)

func (r *DebtReconciler) sendSMSNotice(user string, oweAmount int64, noticeType int) error {
	if r.SmsConfig == nil && r.VmsConfig == nil && r.smtpConfig == nil {
		return nil
	}
	outh, err := r.AccountV2.GetUserOauthProvider(&pkgtypes.UserQueryOpts{Owner: user})
	if err != nil {
		return fmt.Errorf("failed to get user oauth provider: %w", err)
	}
	phone, email := "", ""
	for i := range outh {
		if outh[i].ProviderType == pkgtypes.OauthProviderTypePhone {
			phone = outh[i].ProviderID
		} else if outh[i].ProviderType == pkgtypes.OauthProviderTypeEmail {
			email = outh[i].ProviderID
		}
	}
	if phone != "" {
		if r.SmsConfig != nil && r.SmsConfig.SmsCode[noticeType] != "" {
			oweamount := strconv.FormatInt(int64(math.Abs(math.Ceil(float64(oweAmount)/1_000_000))), 10)
			err = utils.SendSms(r.SmsConfig.Client, &client2.SendSmsRequest{
				PhoneNumbers: tea.String(phone),
				SignName:     tea.String(r.SmsConfig.SmsSignName),
				TemplateCode: tea.String(r.SmsConfig.SmsCode[noticeType]),
				// ｜ownAmount/1_000_000｜
				TemplateParam: tea.String("{\"user_id\":\"" + user + "\",\"oweamount\":\"" + oweamount + "\"}"),
			})
			if err != nil {
				return fmt.Errorf("failed to send sms notice: %w", err)
			}
		}
		if r.VmsConfig != nil && noticeType == WarningNotice && r.VmsConfig.TemplateCode[noticeType] != "" {
			err = utils.SendVms(phone, r.VmsConfig.TemplateCode[noticeType], r.VmsConfig.NumberPoll, GetSendVmsTimeInUTCPlus8(time.Now()), forbidTimes)
			if err != nil {
				return fmt.Errorf("failed to send vms notice: %w", err)
			}
		}
	}
	if r.smtpConfig != nil && email != "" {
		if err = r.smtpConfig.SendEmail(EmailTemplateZH[noticeType]+"\n"+EmailTemplateEN[noticeType], email); err != nil {
			return fmt.Errorf("failed to send email notice: %w", err)
		}
	}
	return nil
}

// GetSendVmsTimeInUTCPlus8 send vms time in UTC+8 10:00-20:00
func GetSendVmsTimeInUTCPlus8(t time.Time) time.Time {
	nowInUTCPlus8 := t.In(UTCPlus8)
	hour := nowInUTCPlus8.Hour()
	if hour >= 10 && hour < 20 {
		return t
	}
	var next10AM time.Time
	if hour < 10 {
		next10AM = time.Date(nowInUTCPlus8.Year(), nowInUTCPlus8.Month(), nowInUTCPlus8.Day(), 10, 0, 0, 0, UTCPlus8)
	} else {
		next10AM = time.Date(nowInUTCPlus8.Year(), nowInUTCPlus8.Month(), nowInUTCPlus8.Day()+1, 10, 0, 0, 0, UTCPlus8)
	}
	return next10AM.In(time.Local)
}

func (r *DebtReconciler) readNotice(ctx context.Context, namespaces []string, noticeTypes ...int) error {
	for i := range namespaces {
		for j := range noticeTypes {
			ntf := &v1.Notification{}
			if err := r.Get(ctx, types.NamespacedName{Name: debtChoicePrefix + strconv.Itoa(noticeTypes[j]), Namespace: namespaces[i]}, ntf); client.IgnoreNotFound(err) != nil {
				return err
			} else if err != nil {
				continue
			}
			if ntf.Labels == nil {
				ntf.Labels = make(map[string]string)
			} else if ntf.Labels[readStatusLabel] == trueStatus {
				continue
			}
			ntf.Labels[readStatusLabel] = trueStatus
			if err := r.Client.Update(ctx, ntf); err != nil {
				return err
			}
		}
	}
	return nil
}

func (r *DebtReconciler) sendNotice(ctx context.Context, user string, oweAmount int64, noticeType int, namespaces []string, smsEnable bool) error {
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
	if smsEnable && (noticeType == WarningNotice || noticeType == ImminentDeletionNotice) {
		return r.sendSMSNotice(user, oweAmount, noticeType)
	}
	return nil
}

func (r *DebtReconciler) sendWarningNotice(ctx context.Context, user string, oweAmount int64, namespaces []string, smsEnable bool) error {
	return r.sendNotice(ctx, user, oweAmount, WarningNotice, namespaces, smsEnable)
}

func (r *DebtReconciler) sendApproachingDeletionNotice(ctx context.Context, user string, oweAmount int64, namespaces []string, smsEnable bool) error {
	return r.sendNotice(ctx, user, oweAmount, ApproachingDeletionNotice, namespaces, smsEnable)
}

func (r *DebtReconciler) sendImminentDeletionNotice(ctx context.Context, user string, oweAmount int64, namespaces []string, smsEnable bool) error {
	return r.sendNotice(ctx, user, oweAmount, ImminentDeletionNotice, namespaces, smsEnable)
}

func (r *DebtReconciler) sendFinalDeletionNotice(ctx context.Context, user string, oweAmount int64, namespaces []string, smsEnable bool) error {
	return r.sendNotice(ctx, user, oweAmount, FinalDeletionNotice, namespaces, smsEnable)
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

func (r *DebtReconciler) setupSmsConfig() error {
	if err := env.CheckEnvSetting([]string{SMSAccessKeyIDEnv, SMSAccessKeySecretEnv, SMSEndpointEnv, SMSSignNameEnv, SMSCodeMapEnv}); err != nil {
		return fmt.Errorf("check env setting error: %w", err)
	}

	smsCodeMap, err := splitSmsCodeMap(os.Getenv(SMSCodeMapEnv))
	if err != nil {
		return fmt.Errorf("split sms code map error: %w", err)
	}

	smsClient, err := utils.CreateSMSClient(os.Getenv(SMSAccessKeyIDEnv), os.Getenv(SMSAccessKeySecretEnv), os.Getenv(SMSEndpointEnv))
	if err != nil {
		return fmt.Errorf("create sms client error: %w", err)
	}
	r.SmsConfig = &SmsConfig{
		Client:      smsClient,
		SmsSignName: os.Getenv(SMSSignNameEnv),
		SmsCode:     smsCodeMap,
	}
	return nil
}

func (r *DebtReconciler) setupVmsConfig() error {
	if err := env.CheckEnvSetting([]string{VmsAccessKeyIDEnv, VmsAccessKeySecretEnv, VmsNumberPollEnv}); err != nil {
		return fmt.Errorf("check env setting error: %w", err)
	}
	vms.DefaultInstance.Client.SetAccessKey(os.Getenv(VmsAccessKeyIDEnv))
	vms.DefaultInstance.Client.SetSecretKey(os.Getenv(VmsAccessKeySecretEnv))

	vmsCodeMap, err := splitSmsCodeMap(os.Getenv(VmsCodeMapEnv))
	if err != nil {
		return fmt.Errorf("split vms code map error: %w", err)
	}
	r.VmsConfig = &VmsConfig{
		TemplateCode: vmsCodeMap,
		NumberPoll:   os.Getenv(VmsNumberPollEnv),
	}
	return nil
}

func (r *DebtReconciler) setupSMTPConfig() error {
	if err := env.CheckEnvSetting([]string{SMTPHostEnv, SMTPPortEnv, SMTPFromEnv, SMTPPasswordEnv, SMTPTitleEnv}); err != nil {
		return fmt.Errorf("check env setting error: %w", err)
	}
	serverPort, err := strconv.Atoi(os.Getenv(SMTPPortEnv))
	if err != nil {
		return fmt.Errorf("invalid smtp port: %w", err)
	}
	r.smtpConfig = &utils.SMTPConfig{
		ServerHost: os.Getenv(SMTPHostEnv),
		ServerPort: serverPort,
		FromEmail:  os.Getenv(SMTPFromEnv),
		Passwd:     os.Getenv(SMTPPasswordEnv),
		EmailTitle: os.Getenv(SMTPTitleEnv),
	}
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *DebtReconciler) SetupWithManager(mgr ctrl.Manager, rateOpts controller.Options) error {
	r.Logger = ctrl.Log.WithName("DebtController")
	r.accountSystemNamespace = env.GetEnvWithDefault(accountv1.AccountSystemNamespaceEnv, "account-system")
	r.LocalRegionID = os.Getenv(cockroach.EnvLocalRegion)
	debtDetectionCycleSecond := env.GetInt64EnvWithDefault(DebtDetectionCycleEnv, 1800)
	r.DebtDetectionCycle = time.Duration(debtDetectionCycleSecond) * time.Second

	setupList := []func() error{
		r.setupSmsConfig,
		r.setupVmsConfig,
		r.setupSMTPConfig,
	}
	for i := range setupList {
		if err := setupList[i](); err != nil {
			r.Logger.Error(err, fmt.Sprintf("failed to set up %s", runtime2.FuncForPC(reflect.ValueOf(setupList[i]).Pointer()).Name()))
		}
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
		"accountSystemNamespace", r.accountSystemNamespace)
	return ctrl.NewControllerManagedBy(mgr).
		For(&userv1.User{}, builder.WithPredicates(predicate.And(UserOwnerPredicate{}))).
		Watches(&accountv1.Payment{}, &handler.EnqueueRequestForObject{}).
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
	NoticeTemplateZH = map[int]string{
		WarningNotice:             "当前工作空间所属账户余额不足，系统将为您暂停服务，请及时充值，以免影响您的正常使用。",
		ApproachingDeletionNotice: fmt.Sprintf("当前工作空间所属账户余额不足，系统将在%2.f小时后或欠费超过充值金额后释放当前空间的资源，请及时充值，以免影响您的正常使用。", math.Ceil(float64(DebtConfig[accountv1.ImminentDeletionPeriod])/3600)),
		ImminentDeletionNotice:    fmt.Sprintf("当前工作空间容器实例资源已被暂停，系统将在%2.f小时后彻底释放资源，无法恢复，请及时充值，以免影响您的正常使用。", math.Ceil(float64(DebtConfig[accountv1.FinalDeletionPeriod])/3600)),
		FinalDeletionNotice:       "系统将随时彻底释放当前工作空间所属账户下的所有资源，请及时充值，以免影响您的正常使用。",
	}
	NoticeTemplateEN = map[int]string{
		WarningNotice:             "Your account balance is not enough to pay this month's bill, and services will be suspended for you. Please recharge in time to avoid affecting your normal use.",
		ApproachingDeletionNotice: fmt.Sprintf("Your account balance is not enough to pay this month's bill, and your resources will be released after %2.f hours or when the arrears exceed the recharge amount. Please recharge in time to avoid affecting your normal use.", math.Ceil(float64(DebtConfig[accountv1.ImminentDeletionPeriod])/3600)),
		ImminentDeletionNotice:    fmt.Sprintf("Your container instance resources have been suspended, and the system will completely release the resources after %2.f hours, which cannot be recovered. Please recharge in time to avoid affecting your normal use.", math.Ceil(float64(DebtConfig[accountv1.FinalDeletionPeriod])/3600)),
		FinalDeletionNotice:       "The system will completely release all your resources at any time. Please recharge in time to avoid affecting your normal use.",
	}
	domain := os.Getenv("DOMAIN")
	EmailTemplateEN, EmailTemplateZH = make(map[int]string), make(map[int]string)
	for _, i := range []int{WarningNotice, ApproachingDeletionNotice, ImminentDeletionNotice, FinalDeletionNotice} {
		EmailTemplateEN[i] = TitleTemplateEN[i] + "：" + NoticeTemplateEN[i] + "(" + domain + ")"
		EmailTemplateZH[i] = TitleTemplateZH[i] + "：" + NoticeTemplateZH[i] + "(" + domain + ")"
	}
}

type UserOwnerPredicate struct {
	predicate.Funcs
}

func (UserOwnerPredicate) Create(e event.CreateEvent) bool {
	owner := e.Object.GetAnnotations()[userv1.UserAnnotationOwnerKey]
	return owner != "" && owner == e.Object.GetName()
}

func (UserOwnerPredicate) Update(_ event.UpdateEvent) bool {
	return false
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

func init() {
	setDefaultDebtPeriodWaitSecond()
}
