package controllers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"reflect"
	runtime2 "runtime"
	"strconv"
	"strings"
	"sync"
	"text/template"
	"time"

	client2 "github.com/alibabacloud-go/dysmsapi-20170525/v3/client"
	"github.com/alibabacloud-go/tea/tea"
	"github.com/go-logr/logr"
	"github.com/google/uuid"
	v1 "github.com/labring/sealos/controllers/account/api/v1"
	utils2 "github.com/labring/sealos/controllers/account/controllers/utils"
	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/database/cockroach"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/controllers/pkg/utils"
	"github.com/labring/sealos/controllers/pkg/utils/env"
	dlock "github.com/labring/sealos/controllers/pkg/utils/lock"
	"github.com/labring/sealos/controllers/pkg/utils/maps"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/volcengine/volc-sdk-golang/service/vms"
	"gorm.io/gorm"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
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
	InitUserAccountFunc func(user *types.UserQueryOpts) (*types.Account, error)
	Scheme              *runtime.Scheme
	DebtDetectionCycle  time.Duration
	LocalRegionID       string
	logr.Logger
	accountSystemNamespace string
	SmsConfig              *SmsConfig
	VmsConfig              *VmsConfig
	smtpConfig             *utils2.SMTPConfig
	DebtUserMap            *maps.ConcurrentMap
	// TODO need init
	userLocks                   *sync.Map
	failedUserLocks             *sync.Map
	processID                   string
	SkipExpiredUserTimeDuration time.Duration
	SendDebtStatusEmailBody     map[v1.DebtStatusType]string
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

var DebtConfig = v1.DefaultDebtConfig

func (r *DebtReconciler) DetermineCurrentStatus(
	oweamount int64,
	userUID uuid.UUID,
	updateIntervalSeconds int64,
	lastStatus v1.DebtStatusType,
) (v1.DebtStatusType, error) {
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

func (r *DebtReconciler) determineCurrentStatusWithSubscription(
	oweamount int64,
	userUID uuid.UUID,
	updateIntervalSeconds int64,
	lastStatus v1.DebtStatusType,
) (v1.DebtStatusType, error) {
	userSubscription, err := r.AccountV2.GetSubscription(&types.UserQueryOpts{UID: userUID})
	if err != nil {
		return v1.NormalPeriod, fmt.Errorf("failed to get user subscription: %w", err)
	}

	if oweamount > 0 && userSubscription.Status == types.SubscriptionStatusNormal {
		if oweamount >= 5*BaseUnit {
			return v1.NormalPeriod, nil
		} else if oweamount > 1*BaseUnit {
			return v1.LowBalancePeriod, nil
		}
		return v1.CriticalBalancePeriod, nil
	}
	if lastStatus == v1.NormalPeriod || lastStatus == v1.LowBalancePeriod ||
		lastStatus == v1.CriticalBalancePeriod {
		return v1.DebtPeriod, nil
	}
	if lastStatus == v1.DebtPeriod && updateIntervalSeconds >= DebtConfig[v1.DebtDeletionPeriod] {
		return v1.DebtDeletionPeriod, nil
	}
	if lastStatus == v1.DebtDeletionPeriod &&
		updateIntervalSeconds >= DebtConfig[v1.FinalDeletionPeriod] {
		return v1.FinalDeletionPeriod, nil
	}
	return lastStatus, nil // Maintain current debt state if no transition
}

func determineCurrentStatus(
	oweamount, updateIntervalSeconds int64,
	lastStatus v1.DebtStatusType,
) v1.DebtStatusType {
	if oweamount > 0 {
		if oweamount > 10*BaseUnit {
			return v1.NormalPeriod
		} else if oweamount > 5*BaseUnit {
			return v1.LowBalancePeriod
		}
		return v1.CriticalBalancePeriod
	}
	if lastStatus == v1.NormalPeriod || lastStatus == v1.LowBalancePeriod ||
		lastStatus == v1.CriticalBalancePeriod {
		return v1.DebtPeriod
	}
	if lastStatus == v1.DebtPeriod && updateIntervalSeconds >= DebtConfig[v1.DebtDeletionPeriod] {
		return v1.DebtDeletionPeriod
	}
	if lastStatus == v1.DebtDeletionPeriod &&
		updateIntervalSeconds >= DebtConfig[v1.FinalDeletionPeriod] {
		return v1.FinalDeletionPeriod
	}
	return lastStatus // Maintain current debt state if no transition
}

const (
	// fromEn = "Debt-System"
	// fromZh = "欠费系统"
	// languageEn = "en"
	// languageZh       = "zh"
	// debtChoicePrefix = "debt-choice-"
	// readStatusLabel  = "isRead"
	// falseStatus      = "false"
	trueStatus = "true"
)

var (
	TitleTemplateZHMap = map[v1.DebtStatusType]string{
		v1.LowBalancePeriod:      "余额不足",
		v1.CriticalBalancePeriod: "余额即将耗尽",
		v1.DebtPeriod:            "余额耗尽",
		v1.DebtDeletionPeriod:    "即将资源释放",
		v1.FinalDeletionPeriod:   "彻底资源释放",
	}
	TitleTemplateENMap = map[v1.DebtStatusType]string{
		v1.LowBalancePeriod:      "Low Balance",
		v1.CriticalBalancePeriod: "Critical Balance",
		v1.DebtPeriod:            "Debt",
		v1.DebtDeletionPeriod:    "Imminent Resource Release",
		v1.FinalDeletionPeriod:   "Radical resource release",
	}
	NoticeTemplateENMap map[v1.DebtStatusType]string
	NoticeTemplateZHMap map[v1.DebtStatusType]string
	EmailTemplateENMap  map[v1.DebtStatusType]string
	EmailTemplateZHMap  map[v1.DebtStatusType]string
)

var (
	forbidTimes = []string{"00:00-10:00", "20:00-24:00"}
	UTCPlus8    = time.FixedZone("UTC+8", 8*3600)
)

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
		if _, ok := types.StatusMap[types.DebtStatusType(key)]; !ok {
			return fmt.Errorf("invalid sms code map key: %s", key)
		}
	}
	r.Info("set sms code map", "smsCodeMap", smsCodeMap, "smsSignName", os.Getenv(SMSSignNameEnv))
	smsClient, err := utils2.CreateSMSClient(
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
		if _, ok := types.StatusMap[types.DebtStatusType(key)]; !ok {
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
	r.smtpConfig = &utils2.SMTPConfig{
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
		Watches(&v1.Payment{}, &handler.EnqueueRequestForObject{}).
		WithOptions(rateOpts).
		Complete(r)
}

func (r *DebtReconciler) Init() {
	r.Logger = ctrl.Log.WithName("DebtController")
	r.accountSystemNamespace = env.GetEnvWithDefault(v1.AccountSystemNamespaceEnv, "account-system")
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
	r.SendDebtStatusEmailBody = make(map[v1.DebtStatusType]string)
	for _, status := range []v1.DebtStatusType{v1.LowBalancePeriod, v1.CriticalBalancePeriod, v1.DebtPeriod, v1.DebtDeletionPeriod, v1.FinalDeletionPeriod} {
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
	DebtConfig[v1.DebtDeletionPeriod] = env.GetInt64EnvWithDefault(
		string(v1.DebtDeletionPeriod),
		7*v1.DaySecond,
	)
	DebtConfig[v1.FinalDeletionPeriod] = env.GetInt64EnvWithDefault(
		string(v1.FinalDeletionPeriod),
		7*v1.DaySecond,
	)
	domain := os.Getenv("DOMAIN")
	NoticeTemplateZHMap = map[v1.DebtStatusType]string{
		v1.LowBalancePeriod:      "当前工作空间所属账户余额过低，请及时充值，以免影响您的正常使用。",
		v1.CriticalBalancePeriod: "当前工作空间所属账户余额即将耗尽，请及时充值，以免影响您的正常使用。",
		v1.DebtPeriod:            "当前工作空间所属账户余额已耗尽，系统将为您暂停服务，请及时充值，以免影响您的正常使用。",
		v1.DebtDeletionPeriod:    "系统即将释放当前空间的资源，请及时充值，以免影响您的正常使用。",
		v1.FinalDeletionPeriod:   "系统将随时彻底释放当前工作空间所属账户下的所有资源，请及时充值，以免影响您的正常使用。",
	}
	NoticeTemplateENMap = map[v1.DebtStatusType]string{
		v1.LowBalancePeriod:      "Your account balance is too low, please recharge in time to avoid affecting your normal use.",
		v1.CriticalBalancePeriod: "Your account balance is about to run out, please recharge in time to avoid affecting your normal use.",
		v1.DebtPeriod:            "Your account balance has been exhausted, and services will be suspended for you. Please recharge in time to avoid affecting your normal use.",
		v1.DebtDeletionPeriod:    "The system will release the resources of the current space soon. Please recharge in time to avoid affecting your normal use.",
		v1.FinalDeletionPeriod:   "The system will completely release all resources under the current account at any time. Please recharge in time to avoid affecting your normal use.",
	}
	EmailTemplateZHMap, EmailTemplateENMap = make(
		map[v1.DebtStatusType]string,
	), make(
		map[v1.DebtStatusType]string,
	)
	for _, i := range []v1.DebtStatusType{v1.LowBalancePeriod, v1.CriticalBalancePeriod, v1.DebtPeriod, v1.DebtDeletionPeriod, v1.FinalDeletionPeriod} {
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

func (r *DebtReconciler) Start(ctx context.Context) error {
	lock := dlock.NewDistributedLock(r.AccountV2.GetGlobalDB(), "debt_reconciler", r.processID)
	if err := lock.TryLock(context.Background(), 15*time.Second); err != nil {
		if errors.Is(err, dlock.ErrLockNotAcquired) {
			time.Sleep(5 * time.Second)
			return r.Start(ctx)
		}
	}
	defer func() {
		if err := lock.Unlock(); err != nil {
			log.Printf("failed to unlock: %v", err)
		}
	}()
	log.Printf("debt reconciler lock acquired, process ID: %s", r.processID)
	r.start()
	log.Printf("debt reconciler started")
	return nil
}

func (r *DebtReconciler) start() {
	db := r.AccountV2.GetGlobalDB()
	var wg sync.WaitGroup

	// 1.1 account update processing
	wg.Add(1)
	go func() {
		defer wg.Done()
		r.processWithTimeRange(
			&types.Account{},
			"updated_at",
			1*time.Minute,
			24*time.Hour,
			func(db *gorm.DB, start, end time.Time) error {
				users, err := getUniqueUsers(db, &types.Account{}, "updated_at", start, end)
				if err != nil {
					return fmt.Errorf("failed to get unique users: %w", err)
				}
				if len(users) > 0 {
					r.Info(
						"processed account updates",
						"count",
						len(users),
						"start",
						start,
						"end",
						end,
					)
					r.processUsersInParallel(users)
				}
				return nil
			},
		)
	}()

	// 1.2 the arrears are transferred to the clearing state
	wg.Add(1)
	go func() {
		defer wg.Done()
		ticker := time.NewTicker(5 * time.Minute)
		for range ticker.C {
			var users []uuid.UUID
			if err := db.Model(&types.Debt{}).Where("account_debt_status = ? AND updated_at < ?", types.DebtPeriod, time.Now().UTC().Add(-7*24*time.Hour)).
				Distinct("user_uid").Pluck("user_uid", &users).Error; err != nil {
				r.Error(
					err,
					"failed to query unique users",
					"account_debt_status",
					types.DebtPeriod,
					"updated_at",
					time.Now().Add(-7*24*time.Hour),
				)
				continue
			}
			if len(users) > 0 {
				r.processUsersInParallel(users)
				r.Info(
					"processed debt status",
					"count",
					len(users),
					"updated_at",
					time.Now().Add(-7*24*time.Hour),
				)
			}
		}
	}()

	// 1.3 clearing changes to delete state
	wg.Add(1)
	go func() {
		defer wg.Done()
		ticker := time.NewTicker(5 * time.Minute)
		for range ticker.C {
			var users []uuid.UUID
			if err := db.Model(&types.Debt{}).Where("account_debt_status = ? AND updated_at < ?", types.DebtDeletionPeriod, time.Now().UTC().Add(-7*24*time.Hour)).
				Distinct("user_uid").Pluck("user_uid", &users).Error; err != nil {
				r.Error(
					err,
					"failed to query unique users",
					"account_debt_status",
					types.DebtPeriod,
					"updated_at",
					time.Now().Add(-7*24*time.Hour),
				)
				continue
			}
			if len(users) > 0 {
				r.processUsersInParallel(users)
				r.Info(
					"processed debt status",
					"count",
					len(users),
					"updated_at",
					time.Now().Add(-7*24*time.Hour),
				)
			}
		}
	}()

	// 2.1 recharge record processing
	wg.Add(1)
	go func() {
		defer wg.Done()
		r.processWithTimeRange(
			&types.Payment{},
			"created_at",
			10*time.Second,
			1*time.Hour,
			func(db *gorm.DB, start, end time.Time) error {
				users, err := getUniqueUsers(db, &types.Payment{}, "created_at", start, end)
				if err != nil {
					return fmt.Errorf("failed to get unique users: %w", err)
				}
				if len(users) > 0 {
					r.processUsersInParallel(users)
					r.Info(
						"processed payment records",
						"count",
						len(users),
						"start",
						start,
						"end",
						end,
					)
				}
				return nil
			},
		)
	}()

	// 2.2 subscription change processing
	// wg.Add(1)
	// go func() {
	// 	defer wg.Done()
	// 	r.processWithTimeRange(
	// 		&types.Subscription{},
	// 		"update_at",
	// 		1*time.Minute,
	// 		24*time.Hour,
	// 		func(db *gorm.DB, start, end time.Time) error {
	// 			users, err := getUniqueUsers(db, &types.Subscription{}, "update_at", start, end)
	// 			if err != nil {
	// 				return fmt.Errorf("failed to get unique users: %w", err)
	// 			}
	// 			if len(users) > 0 {
	// 				r.processUsersInParallel(users)
	// 				r.Info(
	// 					"processed subscription changes",
	// 					"count",
	// 					len(users),
	// 					"users",
	// 					users,
	// 					"start",
	// 					start,
	// 					"end",
	// 					end,
	// 				)
	// 			}
	// 			return nil
	// 		},
	// 	)
	// }()

	// 2.3 credits refresh processing
	// wg.Add(1)
	// go func() {
	// 	defer wg.Done()
	// 	r.processWithTimeRange(
	// 		&types.Credits{},
	// 		"updated_at",
	// 		1*time.Minute,
	// 		24*time.Hour,
	// 		func(db *gorm.DB, start, end time.Time) error {
	// 			users, err := getUniqueUsers(db, &types.Credits{}, "updated_at", start, end)
	// 			if err != nil {
	// 				return fmt.Errorf("failed to get unique users: %w", err)
	// 			}
	// 			if len(users) > 0 {
	// 				r.processUsersInParallel(users)
	// 				r.Info(
	// 					"processed credits refresh",
	// 					"count",
	// 					len(users),
	// 					"users",
	// 					users,
	// 					"start",
	// 					start,
	// 					"end",
	// 					end,
	// 				)
	// 			}
	// 			return nil
	// 		},
	// 	)
	// }()

	// 3 retry failed users
	wg.Add(1)
	go func() {
		defer wg.Done()
		r.retryFailedUsers()
	}()

	wg.Wait()
}

func (r *DebtReconciler) RefreshDebtStatus(userUID uuid.UUID) error {
	return r.refreshDebtStatus(userUID, false)
}

func (r *DebtReconciler) refreshDebtStatus(userUID uuid.UUID, skipSendMsg bool) error {
	account, err := r.AccountV2.GetAccountWithCredits(userUID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("failed to get account %s: %w", userUID, err)
	}
	if account == nil {
		return fmt.Errorf("account %s not found", userUID)
	}
	if account.DeductionBalance == 0 {
		return nil
	}
	debt := types.Debt{}
	err = r.AccountV2.GetGlobalDB().
		Model(&types.Debt{}).
		Where("user_uid = ?", userUID).
		First(&debt).
		Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("failed to get debt %s: %w", userUID, err)
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil
	}
	isBasicUser := account.Balance <= 10*BaseUnit
	oweamount := account.Balance - account.DeductionBalance + account.UsableCredits
	// update interval seconds
	updateIntervalSeconds := time.Now().UTC().Unix() - debt.UpdatedAt.UTC().Unix()
	lastStatus := debt.AccountDebtStatus
	update := false
	if lastStatus == "" {
		lastStatus = types.NormalPeriod
		update = true
	}
	currentStatusRaw, err := r.DetermineCurrentStatus(
		oweamount,
		account.UserUID,
		updateIntervalSeconds,
		v1.DebtStatusType(lastStatus),
	)
	if err != nil {
		return fmt.Errorf("failed to determine current status for user %s: %w", userUID, err)
	}
	currentStatus := types.DebtStatusType(currentStatusRaw)
	if lastStatus == currentStatus && !update {
		return nil
	}
	if lastStatus != currentStatus {
		if err := r.sendFlushDebtResourceStatusRequest(AdminFlushResourceStatusReq{
			UserUID:           userUID,
			LastDebtStatus:    lastStatus,
			CurrentDebtStatus: currentStatus,
			IsBasicUser:       isBasicUser,
		}); err != nil {
			return fmt.Errorf("failed to send flush resource status request: %w", err)
		}
	}

	switch lastStatus {
	case types.NormalPeriod, types.LowBalancePeriod, types.CriticalBalancePeriod:
		if types.ContainDebtStatus(types.DebtStates, currentStatus) {
			// resume user account
			if err = r.ResumeBalance(userUID); err != nil {
				return fmt.Errorf("failed to resume balance: %w", err)
			}
			if !skipSendMsg {
				if err := r.SendUserDebtMsg(userUID, oweamount, currentStatus, isBasicUser); err != nil {
					return NewErrSendMsg(err, userUID)
				}
			}
			break
		}
		if types.StatusMap[currentStatus] > types.StatusMap[lastStatus] {
			// TODO send sms
			if !skipSendMsg && account.Balance > 0 {
				if err := r.SendUserDebtMsg(userUID, oweamount, currentStatus, isBasicUser); err != nil {
					return NewErrSendMsg(err, userUID)
				}
			}
		}
	case types.DebtPeriod,
		types.DebtDeletionPeriod,
		types.FinalDeletionPeriod: // The current status may be: (Normal, LowBalance, CriticalBalance) Period [Service needs to be restored], DebtDeletionPeriod [Service suspended]
		if types.ContainDebtStatus(types.DebtStates, currentStatus) {
			if err = r.ResumeBalance(userUID); err != nil {
				return fmt.Errorf("failed to resume balance: %w", err)
			}
		}
		if currentStatus != types.FinalDeletionPeriod {
			if !skipSendMsg && types.StatusMap[currentStatus] > types.StatusMap[lastStatus] {
				if err := r.SendUserDebtMsg(userUID, oweamount, currentStatus, isBasicUser); err != nil {
					return NewErrSendMsg(err, userUID)
				}
			}
		}
	}

	r.Logger.V(1).Info("update debt status", "account", debt.UserUID,
		"last status", lastStatus, "last update time", debt.UpdatedAt.Format(time.RFC3339),
		"current status", debt.AccountDebtStatus, "time", time.Now().UTC().Format(time.RFC3339))

	debt.AccountDebtStatus = currentStatus
	debt.UpdatedAt = time.Now()

	debtRecord := types.DebtStatusRecord{
		ID:            uuid.New(),
		UserUID:       userUID,
		LastStatus:    lastStatus,
		CurrentStatus: currentStatus,
		CreateAt:      time.Now().UTC(),
	}
	err = r.AccountV2.GlobalTransactionHandler(func(tx *gorm.DB) error {
		dErr := tx.Model(&types.Debt{}).Where("user_uid = ?", userUID).Save(debt).Error
		if dErr != nil {
			return fmt.Errorf("failed to save debt: %w", dErr)
		}
		sErr := tx.Model(&types.DebtStatusRecord{}).Create(&debtRecord).Error
		if sErr != nil {
			return fmt.Errorf("failed to save debt status record: %w", sErr)
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("failed to save debt status: %w", err)
	}
	return nil
}

func (r *DebtReconciler) ResumeBalance(userUID uuid.UUID) error {
	account, err := r.AccountV2.GetAccount(&types.UserQueryOpts{UID: userUID})
	if err != nil {
		return fmt.Errorf("failed to get account %s: %w", userUID, err)
	}
	if account.DeductionBalance <= account.Balance {
		return nil
	}
	err = r.AccountV2.GlobalTransactionHandler(func(tx *gorm.DB) error {
		result := tx.Model(&types.Account{}).
			Where(`"userUid" = ?`, userUID).
			Where(`"deduction_balance" > "balance"`).
			Updates(map[string]any{
				"deduction_balance": gorm.Expr("balance"),
			})
		if result.Error != nil {
			return fmt.Errorf("failed to update account balance: %w", result.Error)
		}
		if result.RowsAffected > 0 {
			return tx.Create(&types.DebtResumeDeductionBalanceTransaction{
				UserUID:                userUID,
				BeforeDeductionBalance: account.DeductionBalance,
				AfterDeductionBalance:  account.Balance,
				BeforeBalance:          account.Balance,
			}).Error
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("failed to update account balance: %w", err)
	}
	return nil
}

type SendMsgError struct {
	UserUID uuid.UUID `json:"userUID" bson:"userUID"`
	Err     error     `json:"err"     bson:"err"`
}

func NewErrSendMsg(err error, userUID uuid.UUID) error {
	return SendMsgError{
		UserUID: userUID,
		Err:     err,
	}
}

func (e SendMsgError) Error() string {
	return fmt.Sprintf("failed to send message to user %s: %v", e.UserUID, e.Err)
}

func (r *DebtReconciler) SendUserDebtMsg(
	userUID uuid.UUID,
	oweamount int64,
	currentStatus types.DebtStatusType,
	isBasicUser bool,
) error {
	if r.SmsConfig == nil && r.VmsConfig == nil && r.smtpConfig == nil {
		return nil
	}
	emailTmpl, ok := r.SendDebtStatusEmailBody[v1.DebtStatusType(currentStatus)]
	if !ok {
		return nil
	}
	if isBasicUser && currentStatus == types.LowBalancePeriod {
		return nil
	}
	_user, err := r.AccountV2.GetUser(&types.UserQueryOpts{UID: userUID})
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}
	// skip abnormal user
	if _user.Status != types.UserStatusNormal {
		return nil
	}
	outh, err := r.AccountV2.GetUserOauthProvider(
		&types.UserQueryOpts{UID: _user.UID, ID: _user.ID},
	)
	if err != nil {
		return fmt.Errorf("failed to get user oauth provider: %w", err)
	}
	phone, email := "", ""
	for i := range outh {
		switch outh[i].ProviderType {
		case types.OauthProviderTypePhone:
			phone = outh[i].ProviderID
		case types.OauthProviderTypeEmail:
			email = outh[i].ProviderID
		}
	}
	fmt.Printf("user: %s, phone: %s, email: %s\n", userUID, phone, email)
	if phone != "" {
		if r.SmsConfig != nil && r.SmsConfig.SmsCode[string(currentStatus)] != "" {
			oweamount := strconv.FormatInt(
				int64(math.Abs(math.Ceil(float64(oweamount)/1_000_000))),
				10,
			)
			err = utils2.SendSms(r.SmsConfig.Client, &client2.SendSmsRequest{
				PhoneNumbers: tea.String(phone),
				SignName:     tea.String(r.SmsConfig.SmsSignName),
				TemplateCode: tea.String(r.SmsConfig.SmsCode[string(currentStatus)]),
				// ｜ownAmount/1_000_000｜
				TemplateParam: tea.String(
					"{\"user_id\":\"" + userUID.String() + "\",\"oweamount\":\"" + oweamount + "\"}",
				),
			})
			if err != nil {
				return fmt.Errorf("failed to send sms notice: %w", err)
			}
		}
		if r.VmsConfig != nil && types.ContainDebtStatus(types.DebtStates, currentStatus) &&
			r.VmsConfig.TemplateCode[string(currentStatus)] != "" {
			err = utils2.SendVms(
				phone,
				r.VmsConfig.TemplateCode[string(currentStatus)],
				r.VmsConfig.NumberPoll,
				GetSendVmsTimeInUTCPlus8(time.Now()),
				forbidTimes,
			)
			if err != nil {
				return fmt.Errorf("failed to send vms notice: %w", err)
			}
		}
	}
	if r.smtpConfig != nil && email != "" {
		var emailBody string
		emailSubject := "Low Account Balance Reminder"
		if SubscriptionEnabled {
			var userInfo types.UserInfo
			err = r.AccountV2.GetGlobalDB().
				Where(types.UserInfo{UserUID: userUID}).
				Find(&userInfo).
				Error
			if err != nil {
				return fmt.Errorf("failed to get user info: %w", err)
			}
			emailRender := &utils.EmailDebtRender{
				Type:          string(currentStatus),
				CurrentStatus: currentStatus,
				Domain:        r.AccountV2.GetLocalRegion().Domain,
			}
			if types.ContainDebtStatus(types.DebtStates, currentStatus) {
				if oweamount <= 0 {
					emailRender.GraceReason = []string{string(utils.GraceReasonNoBalance)}
				} else {
					emailRender.GraceReason = []string{string(utils.GraceReasonSubExpired)}
				}
			}
			emailRender.SetUserInfo(&userInfo)

			tmp, err := template.New("debt-reconcile").Parse(emailTmpl)
			if err != nil {
				return fmt.Errorf("failed to parse email template: %w", err)
			}
			var rendered bytes.Buffer
			if err = tmp.Execute(&rendered, emailRender.Build()); err != nil {
				return fmt.Errorf("failed to render email template: %w", err)
			}
			emailBody = rendered.String()
			emailSubject = emailRender.GetSubject()
		} else {
			emailBody = emailTmpl
		}
		if err = r.smtpConfig.SendEmailWithTitle(emailSubject, emailBody, email); err != nil {
			return fmt.Errorf("failed to send email notice: %w", err)
		}
	}
	return nil
}

type AdminFlushResourceStatusReq struct {
	UserUID           uuid.UUID            `json:"userUID"           bson:"userUID"`
	LastDebtStatus    types.DebtStatusType `json:"lastDebtStatus"    bson:"lastDebtStatus"`
	CurrentDebtStatus types.DebtStatusType `json:"currentDebtStatus" bson:"currentDebtStatus"`
	IsBasicUser       bool                 `json:"isBasicUser"       bson:"isBasicUser"`
}

// TODO flush desktop message (send or read) && flush resource quota (suspend or resume or delete)
func (r *DebtReconciler) sendFlushDebtResourceStatusRequest(
	quotaReq AdminFlushResourceStatusReq,
) error {
	for _, domain := range r.allRegionDomain {
		token, err := r.jwtManager.GenerateToken(utils.JwtUser{
			Requester: AdminUserName,
		})
		if err != nil {
			return fmt.Errorf("failed to generate token: %w", err)
		}

		prefix := "https://"
		if strings.Contains(domain, "nip.io") {
			prefix = "http://"
		}
		url := fmt.Sprintf(
			prefix+"account-api.%s/admin/v1alpha1/flush-debt-resource-status",
			domain,
		)

		quotaReqBody, err := json.Marshal(quotaReq)
		if err != nil {
			return fmt.Errorf("failed to marshal request: %w", err)
		}

		var lastErr error
		backoffTime := time.Second

		maxRetries := 3
		for attempt := 1; attempt <= maxRetries; attempt++ {
			req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(quotaReqBody))
			if err != nil {
				return fmt.Errorf("failed to create request: %w", err)
			}

			req.Header.Set("Authorization", "Bearer "+token)
			req.Header.Set("Content-Type", "application/json")
			client := http.Client{}

			resp, err := client.Do(req)
			if err != nil {
				lastErr = fmt.Errorf("failed to send request: %w", err)
			} else {
				defer resp.Body.Close()

				if resp.StatusCode == http.StatusOK {
					lastErr = nil
					break
				}
				body, err := io.ReadAll(resp.Body)
				if err != nil {
					lastErr = fmt.Errorf("unexpected status code: %d, failed to read response body: %w", resp.StatusCode, err)
				} else {
					lastErr = fmt.Errorf("unexpected status code: %d, response body: %s", resp.StatusCode, string(body))
				}
			}

			// 进行重试
			if attempt < maxRetries {
				fmt.Printf(
					"Attempt %d failed: %v. Retrying in %v...\n",
					attempt,
					lastErr,
					backoffTime,
				)
				time.Sleep(backoffTime)
				backoffTime *= 2 // 指数增长退避时间
			}
		}
		if lastErr != nil {
			return fmt.Errorf(
				"failed to send %s request after %d attempts: %w",
				url,
				maxRetries,
				lastErr,
			)
		}
	}
	return nil
}

// 获取时间范围内的不重复用户 UUID
func getUniqueUsers(
	db *gorm.DB,
	table any,
	timeField string,
	startTime, endTime time.Time,
) ([]uuid.UUID, error) {
	var users []uuid.UUID
	switch table.(type) {
	case *types.Account:
		if err := db.Model(table).Where(timeField+" BETWEEN ? AND ?", startTime, endTime).
			// Where("deduction_balance > ?", 0).
			Distinct(`"userUid"`).Pluck(`"userUid"`, &users).Error; err != nil {
			return nil, fmt.Errorf("failed to query unique users: %w", err)
		}
	case *types.AccountTransaction, *types.Payment:
		if err := db.Model(table).Where(timeField+" BETWEEN ? AND ?", startTime, endTime).
			Distinct(`"userUid"`).Pluck(`"userUid"`, &users).Error; err != nil {
			return nil, fmt.Errorf("failed to query unique users: %w", err)
		}
	default:
		if err := db.Model(table).Where(timeField+" BETWEEN ? AND ?", startTime, endTime).
			Distinct("user_uid").Pluck("user_uid", &users).Error; err != nil {
			return nil, fmt.Errorf("failed to query unique users: %w", err)
		}
	}
	return users, nil
}

func (r *DebtReconciler) retryFailedUsers() {
	ticker := time.NewTicker(1 * time.Minute)
	for range ticker.C {
		var failedUsers []uuid.UUID
		r.failedUserLocks.Range(func(key, value any) bool {
			userUID, ok := key.(uuid.UUID)
			if ok {
				failedUsers = append(failedUsers, userUID)
			}
			return true
		})
		if len(failedUsers) > 0 {
			r.Info("retrying failed users", "count", len(failedUsers), "users", failedUsers)
			r.processUsersInParallel(failedUsers)
		}
	}
}

// Parallel processing of user debt status, the same user simultaneously through the lock to implement a debt refresh processing.
func (r *DebtReconciler) processUsersInParallel(users []uuid.UUID) {
	var (
		wg        sync.WaitGroup
		semaphore = make(chan struct{}, 1000)
	)

	for _, user := range users {
		wg.Add(1)
		semaphore <- struct{}{}
		go func(u uuid.UUID) {
			defer wg.Done()
			defer func() { <-semaphore }()
			lock, _ := r.userLocks.LoadOrStore(u, &sync.Mutex{})
			mutex, ok := lock.(*sync.Mutex)
			if !ok {
				r.Error(
					fmt.Errorf("invalid mutex for user %s", u),
					"failed to load user mutex",
				)
				return
			}
			if !mutex.TryLock() {
				// r.Logger.V(1).Info("user debt processing skipped due to existing lock",
				//	"userUID", u)
				return
			}
			defer mutex.Unlock()
			if err := r.RefreshDebtStatus(u); err != nil {
				r.Error(err, fmt.Sprintf("failed to refresh debt status for user %s", u))
				sendMsgNumber := 1
				if value, ok := r.failedUserLocks.LoadOrStore(u, sendMsgNumber); ok {
					if sendMsgNumber, ok = value.(int); ok {
						if sendMsgNumber >= 3 {
							if err = r.refreshDebtStatus(u, true); err != nil {
								r.Error(
									err,
									fmt.Sprintf("failed to refresh debt status for user %s", u),
								)
							} else {
								r.failedUserLocks.Delete(u)
							}
							return
						}
						sendMsgNumber++
						r.failedUserLocks.Store(u, sendMsgNumber)
					}
				}
			} else {
				r.failedUserLocks.Delete(u)
			}
		}(user)
	}
	wg.Wait()
}

// 时间区间轮询处理
func (r *DebtReconciler) processWithTimeRange(
	table any,
	timeField string,
	interval, initialDuration time.Duration,
	processFunc func(*gorm.DB, time.Time, time.Time) error,
) {
	// 首次处理
	startTime := time.Now().Add(-initialDuration)
	endTime := time.Now().Add(-2 * time.Minute)
	users, err := getUniqueUsers(r.AccountV2.GetGlobalDB(), table, timeField, startTime, endTime)
	if err != nil {
		r.Error(
			err,
			"failed to get unique users",
			"table",
			fmt.Sprintf("%T", table),
			"start",
			startTime,
			"end",
			endTime,
		)
		endTime = startTime
	} else if len(users) > 0 {
		r.processUsersInParallel(users)
		r.Info("processed table updates", "table", fmt.Sprintf("%T", table), "count", len(users), "start", startTime, "end", endTime)
	}

	// 后续按时间区间轮询
	lastEndTime := endTime
	ticker := time.NewTicker(interval)
	for range ticker.C {
		startTime = lastEndTime
		endTime = time.Now().Add(-interval)
		// if error occurs, the start time of the next execution is the start time of the last one
		if err := processFunc(r.AccountV2.GetGlobalDB(), startTime, endTime); err != nil {
			r.Error(
				err,
				"failed to process time range",
				"start",
				startTime,
				"end",
				endTime,
				"table",
				fmt.Sprintf("%T", table),
			)
			continue
		}
		lastEndTime = endTime
	}
}
