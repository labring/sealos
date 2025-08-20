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
	"os"
	"reflect"
	runtime2 "runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	client2 "github.com/alibabacloud-go/dysmsapi-20170525/v3/client"
	"github.com/go-logr/logr"
	"github.com/google/uuid"
	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	"github.com/labring/sealos/controllers/account/controllers/utils"
	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/database/cockroach"
	v1 "github.com/labring/sealos/controllers/pkg/notification/api/v1"
	"github.com/labring/sealos/controllers/pkg/pay"
	pkgtypes "github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/controllers/pkg/utils/env"
	"github.com/labring/sealos/controllers/pkg/utils/maps"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/volcengine/volc-sdk-golang/service/vms"
	"gorm.io/gorm"
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
	"sigs.k8s.io/controller-runtime/pkg/handler"
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
	SMTPUserEnv           = "SMTP_USER"
	SMTPPasswordEnv       = "SMTP_PASSWORD"
	SMTPTitleEnv          = "SMTP_TITLE"
)

// DebtReconciler reconciles a Debt object
type DebtReconciler struct {
	client.Client
	*AccountReconciler
	AccountV2           database.AccountV2
	InitUserAccountFunc func(user *pkgtypes.UserQueryOpts) (*pkgtypes.Account, error)
	Scheme              *runtime.Scheme
	DebtDetectionCycle  time.Duration
	LocalRegionID       string
	logr.Logger
	accountSystemNamespace string
	SmsConfig              *SmsConfig
	VmsConfig              *VmsConfig
	smtpConfig             *utils.SMTPConfig
	DebtUserMap            *maps.ConcurrentMap
	// TODO need init
	userLocks                   *sync.Map
	failedUserLocks             *sync.Map
	processID                   string
	SkipExpiredUserTimeDuration time.Duration
	SendDebtStatusEmailBody     map[accountv1.DebtStatusType]string
}

type VmsConfig struct {
	TemplateCode map[string]string
	NumberPoll   string
}

type SmsConfig struct {
	Client      *client2.Client
	SmsSignName string
	SmsCode     map[string]string
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
		reconcileErr = r.reconcile(ctx, payment.Spec.UserCR, payment.Spec.UserID)
	} else if client.IgnoreNotFound(err) != nil {
		return ctrl.Result{}, fmt.Errorf("failed to get payment %s: %w", req.Name, err)
	} else {
		userID, err := r.AccountV2.GetUserID(&pkgtypes.UserQueryOpts{Owner: req.Name, IgnoreEmpty: true})
		if err != nil {
			return ctrl.Result{RequeueAfter: 10 * time.Minute}, fmt.Errorf("failed to get user id %s: %w", req.Name, err)
		}
		if userID == "" {
			r.Info("user id not exist, skip", "user", req.Name)
			return ctrl.Result{}, nil
		}
		reconcileErr = r.reconcile(ctx, req.Name, userID)
	}
	if reconcileErr != nil {
		if errors.Is(reconcileErr, ErrAccountNotExist) || errors.Is(reconcileErr, ErrDebtNotExist) {
			return ctrl.Result{RequeueAfter: 10 * time.Minute}, nil
		}
		r.Error(reconcileErr, "reconcile debt error")
		return ctrl.Result{}, reconcileErr
	}
	return ctrl.Result{RequeueAfter: r.DebtDetectionCycle}, nil
}

func (r *DebtReconciler) reconcile(ctx context.Context, userCr, userID string) error {
	debt := &accountv1.Debt{}
	ops := &pkgtypes.UserQueryOpts{Owner: userCr, ID: userID, IgnoreEmpty: true}
	userUID, err := r.AccountV2.GetUserUID(
		&pkgtypes.UserQueryOpts{Owner: userCr, IgnoreEmpty: true},
	)
	if err != nil {
		return fmt.Errorf("failed to get user uid %s: %w", userCr, err)
	}
	if userUID == uuid.Nil {
		r.Info("user uid not exist, skip", "user", userCr)
		return nil
	}
	ops.UID = userUID
	account, err := r.AccountV2.GetAccountWithCredits(userUID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("failed to get account %s: %w", userCr, err)
	}
	// if account not exist, create account
	if account == nil {
		userOwner := &userv1.User{}
		if err := r.Get(ctx, types.NamespacedName{Name: userCr, Namespace: r.accountSystemNamespace}, userOwner); err != nil {
			// if user not exist, skip
			if client.IgnoreNotFound(err) == nil {
				return nil
			}
			return fmt.Errorf("failed to get usercr %s: %w", userCr, err)
		}
		// if user not exist, skip
		if userOwner.CreationTimestamp.Add(r.SkipExpiredUserTimeDuration).Before(time.Now()) {
			return nil
		}
		_, err = r.InitUserAccountFunc(ops)
		if err != nil {
			return fmt.Errorf("failed to create account %s: %w", userCr, err)
		}
	}
	// In a multi-region scenario, select the region where the account is created for SMS notification
	smsEnable := account.CreateRegionID == r.LocalRegionID

	// r.Logger.Info("reconcile debt", "account", owner, "balance", account.Balance, "deduction balance", account.DeductionBalance)
	if err := r.Get(ctx, client.ObjectKey{Name: GetDebtName(userCr), Namespace: r.accountSystemNamespace}, debt); client.IgnoreNotFound(
		err,
	) != nil {
		return err
	} else if err != nil {
		if err := r.syncDebt(ctx, userCr, userID, debt); err != nil {
			return err
		}
		return ErrDebtNotExist
		// r.Logger.Info("create or update debt success", "debt", debt)
	}
	// backward compatibility
	if debt.Spec.UserID == "" {
		debt.Spec.UserID = userID
		if err := r.Update(ctx, debt); err != nil {
			return fmt.Errorf("update debt %s failed: %w", debt.Name, err)
		}
	}

	nsList, err := getOwnNsList(r.Client, getUsername(userCr))
	if err != nil {
		r.Error(err, "get own ns list error")
		return fmt.Errorf("get own ns list error: %w", err)
	}
	if err := r.reconcileDebtStatus(ctx, debt, account, nsList, smsEnable); err != nil {
		r.Error(err, "reconcile debt status error")
		return err
	}
	return nil
}

func getOwnNsList(clt client.Client, user string) ([]string, error) {
	nsList := &corev1.NamespaceList{}
	if err := clt.List(context.Background(), nsList, client.MatchingLabels{userv1.UserLabelOwnerKey: user}); err != nil {
		return nil, fmt.Errorf("list namespace failed: %w", err)
	}
	nsListStr := make([]string, len(nsList.Items))
	for i := range nsList.Items {
		nsListStr[i] = nsList.Items[i].Name
	}
	return nsListStr, nil
}

var ErrAccountNotExist = errors.New("account not exist")

var ErrDebtNotExist = errors.New("debt not exist")

const (
	NormalPeriod = iota
	LowBalancePeriod
	CriticalBalancePeriod
	DebtPeriod
	DebtDeletionPeriod
	FinalDeletionPeriod
)

var statusMap = map[accountv1.DebtStatusType]int{
	accountv1.NormalPeriod:          NormalPeriod,
	accountv1.LowBalancePeriod:      LowBalancePeriod,
	accountv1.CriticalBalancePeriod: CriticalBalancePeriod,
	accountv1.DebtPeriod:            DebtPeriod,
	accountv1.DebtDeletionPeriod:    DebtDeletionPeriod,
	accountv1.FinalDeletionPeriod:   FinalDeletionPeriod,
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
func (r *DebtReconciler) reconcileDebtStatus(
	ctx context.Context,
	debt *accountv1.Debt,
	account *pkgtypes.UsableBalanceWithCredits,
	userNamespaceList []string,
	smsEnable bool,
) error {
	// Basic users should avoid alarm notification affecting experience
	isBasicUser := account.Balance <= 10*BaseUnit
	oweamount := account.Balance - account.DeductionBalance + account.UsableCredits
	// 更新间隔秒钟数
	updateIntervalSeconds := time.Now().UTC().Unix() - debt.Status.LastUpdateTimestamp
	lastStatus := debt.Status.AccountDebtStatus
	update := false
	if lastStatus == "" {
		lastStatus = accountv1.NormalPeriod
		update = true
	}
	currentStatus, err := r.DetermineCurrentStatus(
		oweamount,
		account.UserUID,
		updateIntervalSeconds,
		lastStatus,
	)
	if err != nil {
		return fmt.Errorf("failed to determine current status: %w", err)
	}
	r.updateDebtUserMap(debt.Spec.UserName, currentStatus)
	if lastStatus == currentStatus && !update {
		return nil
	}
	update = update || SetDebtStatus(debt, lastStatus, currentStatus)
	nonDebtStates := []accountv1.DebtStatusType{
		accountv1.NormalPeriod,
		accountv1.LowBalancePeriod,
		accountv1.CriticalBalancePeriod,
	}
	debtStates := []accountv1.DebtStatusType{
		accountv1.DebtPeriod,
		accountv1.DebtDeletionPeriod,
		accountv1.FinalDeletionPeriod,
	}
	// 判断上次状态到当前的状态
	switch lastStatus {
	case accountv1.NormalPeriod, accountv1.LowBalancePeriod, accountv1.CriticalBalancePeriod:
		if statusMap[currentStatus] > statusMap[lastStatus] {
			if err := r.sendDesktopNoticeAndSms(ctx, debt.Spec.UserName, oweamount, currentStatus, userNamespaceList, smsEnable, isBasicUser); err != nil {
				r.Error(err, fmt.Sprintf("send %s notice error", currentStatus))
			}
		} else {
			if err := r.readNotice(ctx, userNamespaceList, lastStatus); err != nil {
				r.Error(err, "read low balance notice error")
			}
		}
		if contains(debtStates, currentStatus) {
			if err := r.SuspendUserResource(ctx, userNamespaceList); err != nil {
				return err
			}
		}
		// TODO update debt status
		// if lastStatus == accountv1.FinalDeletionPeriod {
		//	err = r.AccountV2.GetGlobalDB().Save(&pkgtypes.UserDebt{
		//		UserID: debt.Spec.UserID,
		//		//Status: pkgtypes.DebtStatusNormal,
		//	}).Error
		//	if err != nil {
		//		return fmt.Errorf("failed to save user debt: %w", err)
		//	}
		//}
	case accountv1.DebtPeriod,
		accountv1.DebtDeletionPeriod,
		accountv1.FinalDeletionPeriod: // The current status may be: (Normal, LowBalance, CriticalBalance) Period [Service needs to be restored], DebtDeletionPeriod [Service suspended]
		if contains(nonDebtStates, currentStatus) {
			if err := r.readNotice(ctx, userNamespaceList, debtStates...); err != nil {
				r.Error(err, "read low balance notice error")
			}
			if err := r.ResumeUserResource(ctx, userNamespaceList); err != nil {
				return err
			}
			break
		}
		if currentStatus != accountv1.FinalDeletionPeriod {
			err = r.sendDesktopNoticeAndSms(
				ctx,
				debt.Spec.UserName,
				oweamount,
				currentStatus,
				userNamespaceList,
				smsEnable,
				isBasicUser,
			)
			if err != nil {
				r.Error(err, fmt.Sprintf("send %s notice error", currentStatus))
			}
			if err = r.SuspendUserResource(ctx, userNamespaceList); err != nil {
				return err
			}
		} else {
			// TODO DELETE
			// err = r.AccountV2.GetGlobalDB().Save(&pkgtypes.UserDebt{
			//	UserID: debt.Spec.UserID,
			//	Status: pkgtypes.DebtStatusDeletionPeriod,
			// }).Error
			// if err != nil {
			//	return fmt.Errorf("failed to save user debt: %w", err)
			//}
			if err = r.DeleteUserResource(ctx, userNamespaceList); err != nil {
				return err
			}
		}
	// 兼容老版本
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

func contains(statuses []accountv1.DebtStatusType, status accountv1.DebtStatusType) bool {
	for _, s := range statuses {
		if s == status {
			return true
		}
	}
	return false
}

func (r *DebtReconciler) updateDebtUserMap(
	username string,
	currentStatus accountv1.DebtStatusType,
) {
	isDebtState := currentStatus == accountv1.DebtPeriod ||
		currentStatus == accountv1.DebtDeletionPeriod ||
		currentStatus == accountv1.FinalDeletionPeriod
	_, exists := r.DebtUserMap.Get(username)

	if isDebtState && !exists {
		r.DebtUserMap.Set(username, struct{}{})
	} else if !isDebtState && exists {
		r.DebtUserMap.Delete(username)
	}
}

func newStatusConversion(debt *accountv1.Debt) bool {
	switch debt.Status.AccountDebtStatus {
	case accountv1.NormalPeriod, accountv1.FinalDeletionPeriod:
		return false
	case accountv1.WarningPeriod:
		debt.Status.AccountDebtStatus = accountv1.DebtPeriod
	case accountv1.ApproachingDeletionPeriod:
		debt.Status.AccountDebtStatus = accountv1.DebtDeletionPeriod
	case accountv1.ImminentDeletionPeriod:
		debt.Status.AccountDebtStatus = accountv1.DebtDeletionPeriod
	default:
		debt.Status.AccountDebtStatus = accountv1.NormalPeriod
	}
	return true
}

func determineCurrentStatus(
	oweamount, updateIntervalSeconds int64,
	lastStatus accountv1.DebtStatusType,
) accountv1.DebtStatusType {
	if oweamount > 0 {
		if oweamount > 10*BaseUnit {
			return accountv1.NormalPeriod
		} else if oweamount > 5*BaseUnit {
			return accountv1.LowBalancePeriod
		}
		return accountv1.CriticalBalancePeriod
	}
	if lastStatus == accountv1.NormalPeriod || lastStatus == accountv1.LowBalancePeriod ||
		lastStatus == accountv1.CriticalBalancePeriod {
		return accountv1.DebtPeriod
	}
	if lastStatus == accountv1.DebtPeriod &&
		updateIntervalSeconds >= DebtConfig[accountv1.DebtDeletionPeriod] {
		return accountv1.DebtDeletionPeriod
	}
	if lastStatus == accountv1.DebtDeletionPeriod &&
		updateIntervalSeconds >= DebtConfig[accountv1.FinalDeletionPeriod] {
		return accountv1.FinalDeletionPeriod
	}
	return lastStatus // Maintain current debt state if no transition
}

func (r *DebtReconciler) determineCurrentStatusWithSubscription(
	oweamount int64,
	userUID uuid.UUID,
	updateIntervalSeconds int64,
	lastStatus accountv1.DebtStatusType,
) (accountv1.DebtStatusType, error) {
	userSubscription, err := r.AccountV2.GetSubscription(&pkgtypes.UserQueryOpts{UID: userUID})
	if err != nil {
		return accountv1.NormalPeriod, fmt.Errorf("failed to get user subscription: %w", err)
	}

	if oweamount > 0 && userSubscription.Status == pkgtypes.SubscriptionStatusNormal {
		if oweamount >= 5*BaseUnit {
			return accountv1.NormalPeriod, nil
		} else if oweamount > 1*BaseUnit {
			return accountv1.LowBalancePeriod, nil
		}
		return accountv1.CriticalBalancePeriod, nil
	}
	if lastStatus == accountv1.NormalPeriod || lastStatus == accountv1.LowBalancePeriod ||
		lastStatus == accountv1.CriticalBalancePeriod {
		return accountv1.DebtPeriod, nil
	}
	if lastStatus == accountv1.DebtPeriod &&
		updateIntervalSeconds >= DebtConfig[accountv1.DebtDeletionPeriod] {
		return accountv1.DebtDeletionPeriod, nil
	}
	if lastStatus == accountv1.DebtDeletionPeriod &&
		updateIntervalSeconds >= DebtConfig[accountv1.FinalDeletionPeriod] {
		return accountv1.FinalDeletionPeriod, nil
	}
	return lastStatus, nil // Maintain current debt state if no transition
}

func (r *DebtReconciler) DetermineCurrentStatus(
	oweamount int64,
	userUID uuid.UUID,
	updateIntervalSeconds int64,
	lastStatus accountv1.DebtStatusType,
) (accountv1.DebtStatusType, error) {
	if SubscriptionEnabled {
		return r.determineCurrentStatusWithSubscription(
			oweamount,
			userUID,
			updateIntervalSeconds,
			lastStatus,
		)
	}
	return determineCurrentStatus(oweamount, updateIntervalSeconds, lastStatus), nil
}

func (r *DebtReconciler) syncDebt(
	ctx context.Context,
	owner, userID string,
	debt *accountv1.Debt,
) error {
	debt.Name = GetDebtName(owner)
	debt.Namespace = r.accountSystemNamespace
	if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, debt, func() error {
		debt.Spec.UserName = owner
		debt.Spec.UserID = userID
		return nil
	}); err != nil {
		return err
	}
	return nil
}

var MaxDebtHistoryStatusLength = env.GetIntEnvWithDefault("MAX_DEBT_HISTORY_STATUS_LENGTH", 10)

func SetDebtStatus(debt *accountv1.Debt, lastStatus, currentStatus accountv1.DebtStatusType) bool {
	if lastStatus == currentStatus {
		return false
	}
	debt.Status.AccountDebtStatus = currentStatus
	now := time.Now().UTC()
	debt.Status.LastUpdateTimestamp = now.Unix()
	length := len(debt.Status.DebtStatusRecords)
	statusRecord := accountv1.DebtStatusRecord{
		LastStatus:    lastStatus,
		CurrentStatus: currentStatus,
		UpdateTime:    metav1.NewTime(now),
	}
	switch length {
	case 0:
		debt.Status.DebtStatusRecords = make([]accountv1.DebtStatusRecord, 0)
	case MaxDebtHistoryStatusLength:
		debt.Status.DebtStatusRecords = debt.Status.DebtStatusRecords[1:]
	}
	debt.Status.DebtStatusRecords = append(debt.Status.DebtStatusRecords, statusRecord)
	return true
}

func GetDebtName(accountName string) string {
	return fmt.Sprintf("%s%s", accountv1.DebtPrefix, accountName)
}

const (
	fromEn = "Debt-System"
	fromZh = "欠费系统"
	// languageEn = "en"
	languageZh       = "zh"
	debtChoicePrefix = "debt-choice-"
	readStatusLabel  = "isRead"
	falseStatus      = "false"
	trueStatus       = "true"
)

var (
	TitleTemplateZHMap = map[accountv1.DebtStatusType]string{
		accountv1.LowBalancePeriod:      "余额不足",
		accountv1.CriticalBalancePeriod: "余额即将耗尽",
		accountv1.DebtPeriod:            "余额耗尽",
		accountv1.DebtDeletionPeriod:    "即将资源释放",
		accountv1.FinalDeletionPeriod:   "彻底资源释放",
	}
	TitleTemplateENMap = map[accountv1.DebtStatusType]string{
		accountv1.LowBalancePeriod:      "Low Balance",
		accountv1.CriticalBalancePeriod: "Critical Balance",
		accountv1.DebtPeriod:            "Debt",
		accountv1.DebtDeletionPeriod:    "Imminent Resource Release",
		accountv1.FinalDeletionPeriod:   "Radical resource release",
	}
	NoticeTemplateENMap map[accountv1.DebtStatusType]string
	NoticeTemplateZHMap map[accountv1.DebtStatusType]string
	EmailTemplateENMap  map[accountv1.DebtStatusType]string
	EmailTemplateZHMap  map[accountv1.DebtStatusType]string
)

var (
	forbidTimes = []string{"00:00-10:00", "20:00-24:00"}
	UTCPlus8    = time.FixedZone("UTC+8", 8*3600)
)

func (r *DebtReconciler) sendSMSNotice(
	user string,
	_ int64,
	noticeType accountv1.DebtStatusType,
) error {
	if r.SmsConfig == nil && r.VmsConfig == nil && r.smtpConfig == nil {
		return nil
	}
	_user, err := r.AccountV2.GetUser(&pkgtypes.UserQueryOpts{Owner: user})
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}
	// skip abnormal user
	if _user.Status != pkgtypes.UserStatusNormal {
		return nil
	}
	outh, err := r.AccountV2.GetUserOauthProvider(
		&pkgtypes.UserQueryOpts{UID: _user.UID, ID: _user.ID},
	)
	if err != nil {
		return fmt.Errorf("failed to get user oauth provider: %w", err)
	}
	phone, email := "", ""
	for i := range outh {
		switch outh[i].ProviderType {
		case pkgtypes.OauthProviderTypePhone:
			phone = outh[i].ProviderID
		case pkgtypes.OauthProviderTypeEmail:
			email = outh[i].ProviderID
		}
	}
	fmt.Printf("user: %s, phone: %s, email: %s\n", user, phone, email)
	// if phone != "" {
	//	if r.SmsConfig != nil && r.SmsConfig.SmsCode[noticeType] != "" {
	//		oweamount := strconv.FormatInt(int64(math.Abs(math.Ceil(float64(oweAmount)/1_000_000))), 10)
	//		err = utils.SendSms(r.SmsConfig.Client, &client2.SendSmsRequest{
	//			PhoneNumbers: tea.String(phone),
	//			SignName:     tea.String(r.SmsConfig.SmsSignName),
	//			TemplateCode: tea.String(r.SmsConfig.SmsCode[noticeType]),
	//			// ｜ownAmount/1_000_000｜
	//			TemplateParam: tea.String("{\"user_id\":\"" + user + "\",\"oweamount\":\"" + oweamount + "\"}"),
	//		})
	//		if err != nil {
	//			return fmt.Errorf("failed to send sms notice: %w", err)
	//		}
	//	}
	//	if r.VmsConfig != nil && noticeType == WarningNotice && r.VmsConfig.TemplateCode[noticeType] != "" {
	//		err = utils.SendVms(phone, r.VmsConfig.TemplateCode[noticeType], r.VmsConfig.NumberPoll, GetSendVmsTimeInUTCPlus8(time.Now()), forbidTimes)
	//		if err != nil {
	//			return fmt.Errorf("failed to send vms notice: %w", err)
	//		}
	//	}
	//}
	if r.smtpConfig != nil && email != "" {
		if err = r.smtpConfig.SendEmail(r.SendDebtStatusEmailBody[noticeType], email); err != nil {
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
		next10AM = time.Date(
			nowInUTCPlus8.Year(),
			nowInUTCPlus8.Month(),
			nowInUTCPlus8.Day(),
			10,
			0,
			0,
			0,
			UTCPlus8,
		)
	} else {
		next10AM = time.Date(nowInUTCPlus8.Year(), nowInUTCPlus8.Month(), nowInUTCPlus8.Day()+1, 10, 0, 0, 0, UTCPlus8)
	}
	return next10AM.In(time.Local)
}

func (r *DebtReconciler) readNotice(
	ctx context.Context,
	namespaces []string,
	noticeTypes ...accountv1.DebtStatusType,
) error {
	for i := range namespaces {
		for _, noticeStatus := range noticeTypes {
			ntf := &v1.Notification{}
			if err := r.Get(ctx, types.NamespacedName{Name: debtChoicePrefix + strings.ToLower(string(noticeStatus)), Namespace: namespaces[i]}, ntf); client.IgnoreNotFound(
				err,
			) != nil {
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
			if err := r.Update(ctx, ntf); err != nil {
				return err
			}
		}
	}
	return nil
}

func (r *DebtReconciler) sendDesktopNoticeAndSms(
	ctx context.Context,
	user string,
	oweAmount int64,
	noticeType accountv1.DebtStatusType,
	namespaces []string,
	smsEnable, isBasicUser bool,
) error {
	if isBasicUser && noticeType != accountv1.DebtPeriod &&
		noticeType != accountv1.DebtDeletionPeriod &&
		noticeType != accountv1.FinalDeletionPeriod &&
		noticeType != accountv1.CriticalBalancePeriod {
		return nil
	}
	if err := r.sendDesktopNotice(ctx, noticeType, namespaces); err != nil {
		return fmt.Errorf("send notice error: %w", err)
	}
	if !smsEnable || (isBasicUser && noticeType == accountv1.CriticalBalancePeriod) {
		return nil
	}
	return r.sendSMSNotice(user, oweAmount, noticeType)
}

func (r *DebtReconciler) sendDesktopNotice(
	ctx context.Context,
	noticeType accountv1.DebtStatusType,
	namespaces []string,
) error {
	now := time.Now().UTC().Unix()
	ntfTmp := &v1.Notification{
		ObjectMeta: metav1.ObjectMeta{
			Name: debtChoicePrefix + strings.ToLower(string(noticeType)),
		},
	}
	ntfTmpSpc := v1.NotificationSpec{
		Title:        TitleTemplateENMap[noticeType],
		Message:      NoticeTemplateENMap[noticeType],
		From:         fromEn,
		Importance:   v1.High,
		DesktopPopup: true,
		Timestamp:    now,
		I18n: map[string]v1.I18n{
			languageZh: {
				Title:   TitleTemplateZHMap[noticeType],
				From:    fromZh,
				Message: NoticeTemplateZHMap[noticeType],
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
	return nil
}

func (r *DebtReconciler) SuspendUserResource(ctx context.Context, namespaces []string) error {
	return r.updateNamespaceStatus(ctx, accountv1.SuspendDebtNamespaceAnnoStatus, namespaces)
}

func (r *DebtReconciler) DeleteUserResource(ctx context.Context, namespace []string) error {
	return r.updateNamespaceStatus(ctx, accountv1.FinalDeletionDebtNamespaceAnnoStatus, namespace)
}

func (r *DebtReconciler) ResumeUserResource(ctx context.Context, namespaces []string) error {
	return r.updateNamespaceStatus(ctx, accountv1.ResumeDebtNamespaceAnnoStatus, namespaces)
}

func (r *DebtReconciler) updateNamespaceStatus(
	ctx context.Context,
	status string,
	namespaces []string,
) error {
	for i := range namespaces {
		ns := &corev1.Namespace{}
		if err := r.Get(ctx, types.NamespacedName{Name: namespaces[i], Namespace: r.accountSystemNamespace}, ns); err != nil {
			return err
		}
		if ns.Annotations[accountv1.DebtNamespaceAnnoStatusKey] == status {
			continue
		}
		// 交给namespace controller处理
		ns.Annotations[accountv1.DebtNamespaceAnnoStatusKey] = status
		if err := r.Update(ctx, ns); err != nil {
			return err
		}
	}
	return nil
}

// convert "1:code1,2:code2" to map[int]string
func splitSmsCodeMap(codeStr string) (map[string]string, error) {
	codeMap := make(map[string]string)
	for _, code := range strings.Split(codeStr, ",") {
		split := strings.SplitN(code, ":", 2)
		if len(split) != 2 {
			return nil, fmt.Errorf("invalid sms code map: %s", codeStr)
		}
		codeMap[split[0]] = split[1]
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
	for key := range smsCodeMap {
		if _, ok := pkgtypes.StatusMap[pkgtypes.DebtStatusType(key)]; !ok {
			return fmt.Errorf("invalid sms code map key: %s", key)
		}
	}
	r.Info("set sms code map", "smsCodeMap", smsCodeMap, "smsSignName", os.Getenv(SMSSignNameEnv))
	smsClient, err := utils.CreateSMSClient(
		os.Getenv(SMSAccessKeyIDEnv),
		os.Getenv(SMSAccessKeySecretEnv),
		os.Getenv(SMSEndpointEnv),
	)
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
	vms.DefaultInstance.SetAccessKey(os.Getenv(VmsAccessKeyIDEnv))
	vms.DefaultInstance.SetSecretKey(os.Getenv(VmsAccessKeySecretEnv))

	vmsCodeMap, err := splitSmsCodeMap(os.Getenv(VmsCodeMapEnv))
	if err != nil {
		return fmt.Errorf("split vms code map error: %w", err)
	}
	for key := range vmsCodeMap {
		if _, ok := pkgtypes.StatusMap[pkgtypes.DebtStatusType(key)]; !ok {
			return fmt.Errorf("invalid sms code map key: %s", key)
		}
	}
	r.Info("set vms code map", "vmsCodeMap", vmsCodeMap)
	r.VmsConfig = &VmsConfig{
		TemplateCode: vmsCodeMap,
		NumberPoll:   os.Getenv(VmsNumberPollEnv),
	}
	return nil
}

func (r *DebtReconciler) setupSMTPConfig() error {
	if err := env.CheckEnvSetting([]string{SMTPHostEnv, SMTPFromEnv, SMTPPasswordEnv, SMTPTitleEnv}); err != nil {
		return fmt.Errorf("check env setting error: %w", err)
	}
	serverPort, err := strconv.Atoi(env.GetEnvWithDefault(SMTPPortEnv, "465"))
	if err != nil {
		return fmt.Errorf("invalid smtp port: %w", err)
	}
	r.smtpConfig = &utils.SMTPConfig{
		ServerHost: os.Getenv(SMTPHostEnv),
		ServerPort: serverPort,
		Username:   env.GetEnvWithDefault(SMTPUserEnv, os.Getenv(SMTPFromEnv)),
		FromEmail:  os.Getenv(SMTPFromEnv),
		Passwd:     os.Getenv(SMTPPasswordEnv),
		EmailTitle: os.Getenv(SMTPTitleEnv),
	}
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *DebtReconciler) SetupWithManager(mgr ctrl.Manager, rateOpts controller.Options) error {
	r.Init()
	/*
		{"DebtConfig":{
		"ApproachingDeletionPeriod":345600,
		"FinalDeletionPeriod":604800,
		"ImminentDeletionPeriod":259200,"WarningPeriod":0},
		"DebtDetectionCycle": "1m0s",
		"accountSystemNamespace": "account-system",
		"accountNamespace": "sealos-system"}
	*/
	r.Info("set config", "DebtConfig", DebtConfig, "DebtDetectionCycle", r.DebtDetectionCycle,
		"accountSystemNamespace", r.accountSystemNamespace)
	return ctrl.NewControllerManagedBy(mgr).
		For(&userv1.User{}, builder.WithPredicates(predicate.And(UserOwnerPredicate{})), builder.OnlyMetadata).
		Watches(&accountv1.Payment{}, &handler.EnqueueRequestForObject{}).
		WithOptions(rateOpts).
		Complete(r)
}

func (r *DebtReconciler) Init() {
	r.Logger = ctrl.Log.WithName("DebtController")
	r.accountSystemNamespace = env.GetEnvWithDefault(
		accountv1.AccountSystemNamespaceEnv,
		"account-system",
	)
	r.LocalRegionID = os.Getenv(cockroach.EnvLocalRegion)
	debtDetectionCycleSecond := env.GetInt64EnvWithDefault(DebtDetectionCycleEnv, 1800)
	r.DebtDetectionCycle = time.Duration(debtDetectionCycleSecond) * time.Second
	r.userLocks = &sync.Map{}
	r.failedUserLocks = &sync.Map{}
	r.processID = uuid.NewString()

	setupList := []func() error{
		r.setupSmsConfig,
		r.setupVmsConfig,
		r.setupSMTPConfig,
	}
	for i := range setupList {
		if err := setupList[i](); err != nil {
			r.Error(
				err,
				"failed to set up "+runtime2.FuncForPC(reflect.ValueOf(setupList[i]).Pointer()).
					Name(),
			)
		}
	}
	setDefaultDebtPeriodWaitSecond()
	r.SendDebtStatusEmailBody = make(map[accountv1.DebtStatusType]string)
	for _, status := range []accountv1.DebtStatusType{accountv1.LowBalancePeriod, accountv1.CriticalBalancePeriod, accountv1.DebtPeriod, accountv1.DebtDeletionPeriod, accountv1.FinalDeletionPeriod} {
		email := os.Getenv(string(status) + "EmailBody")
		if email == "" {
			email = EmailTemplateZHMap[status] + "\n" + EmailTemplateENMap[status]
		} else {
			r.Info("set email body", "status", status, "body", email)
		}
		r.SendDebtStatusEmailBody[status] = email
	}
	r.Info("debt config", "DebtConfig", DebtConfig, "DebtDetectionCycle", r.DebtDetectionCycle)
}

func setDefaultDebtPeriodWaitSecond() {
	DebtConfig[accountv1.DebtDeletionPeriod] = env.GetInt64EnvWithDefault(
		string(accountv1.DebtDeletionPeriod),
		7*accountv1.DaySecond,
	)
	DebtConfig[accountv1.FinalDeletionPeriod] = env.GetInt64EnvWithDefault(
		string(accountv1.FinalDeletionPeriod),
		7*accountv1.DaySecond,
	)
	domain := os.Getenv("DOMAIN")
	NoticeTemplateZHMap = map[accountv1.DebtStatusType]string{
		accountv1.LowBalancePeriod:      "当前工作空间所属账户余额过低，请及时充值，以免影响您的正常使用。",
		accountv1.CriticalBalancePeriod: "当前工作空间所属账户余额即将耗尽，请及时充值，以免影响您的正常使用。",
		accountv1.DebtPeriod:            "当前工作空间所属账户余额已耗尽，系统将为您暂停服务，请及时充值，以免影响您的正常使用。",
		accountv1.DebtDeletionPeriod:    "系统即将释放当前空间的资源，请及时充值，以免影响您的正常使用。",
		accountv1.FinalDeletionPeriod:   "系统将随时彻底释放当前工作空间所属账户下的所有资源，请及时充值，以免影响您的正常使用。",
	}
	NoticeTemplateENMap = map[accountv1.DebtStatusType]string{
		accountv1.LowBalancePeriod:      "Your account balance is too low, please recharge in time to avoid affecting your normal use.",
		accountv1.CriticalBalancePeriod: "Your account balance is about to run out, please recharge in time to avoid affecting your normal use.",
		accountv1.DebtPeriod:            "Your account balance has been exhausted, and services will be suspended for you. Please recharge in time to avoid affecting your normal use.",
		accountv1.DebtDeletionPeriod:    "The system will release the resources of the current space soon. Please recharge in time to avoid affecting your normal use.",
		accountv1.FinalDeletionPeriod:   "The system will completely release all resources under the current account at any time. Please recharge in time to avoid affecting your normal use.",
	}
	EmailTemplateZHMap, EmailTemplateENMap = make(
		map[accountv1.DebtStatusType]string,
	), make(
		map[accountv1.DebtStatusType]string,
	)
	for _, i := range []accountv1.DebtStatusType{accountv1.LowBalancePeriod, accountv1.CriticalBalancePeriod, accountv1.DebtPeriod, accountv1.DebtDeletionPeriod, accountv1.FinalDeletionPeriod} {
		EmailTemplateENMap[i] = TitleTemplateENMap[i] + "：" + NoticeTemplateENMap[i] + "(" + domain + ")"
		EmailTemplateZHMap[i] = TitleTemplateZHMap[i] + "：" + NoticeTemplateZHMap[i] + "(" + domain + ")"
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
