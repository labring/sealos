package dao

import (
	"context"
	"errors"
	"fmt"
	"os"
	"time"

	defaultAlipayClient "github.com/alipay/global-open-sdk-go/com/alipay/api"
	"github.com/goccy/go-json"
	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/gpu"
	v1 "github.com/labring/sealos/controllers/pkg/notification/api/v1"
	"github.com/labring/sealos/controllers/pkg/resources"
	"github.com/labring/sealos/controllers/pkg/types"
	usernotify "github.com/labring/sealos/controllers/pkg/user_notify"
	"github.com/labring/sealos/controllers/pkg/utils"
	"github.com/labring/sealos/controllers/pkg/utils/env"
	"github.com/labring/sealos/controllers/pkg/utils/logger"
	"github.com/labring/sealos/service/account/helper"
	services "github.com/labring/sealos/service/pkg/pay"
	"github.com/sirupsen/logrus"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type Config struct {
	LocalRegionDomain string   `json:"localRegionDomain"`
	Regions           []Region `json:"regions"`
	InvoiceToken      string   `json:"invoiceToken"`
}

type Region struct {
	Domain     string `json:"domain"`
	AccountSvc string `json:"accountSvc"`
	UID        string `json:"uid"`
	// zh: region name, en: region name
	Name map[string]string `json:"name"`
}

var (
	DBClient              Interface
	EmailTmplMap          map[string]string
	SMTPConfig            *utils.SMTPConfig
	ClientIP              string
	DeviceTokenID         string
	PaymentService        *services.AtomPaymentService
	PaymentCurrency       string
	SubPlanResourceQuota  map[string]corev1.ResourceList
	WorkspacePlanResQuota map[string]corev1.ResourceList
	JwtMgr                *utils.JWTManager
	Cfg                   *Config
	BillingTask           *helper.TaskQueue
	FlushQuotaProcesser   *FlushQuotaTask
	K8sManager            ctrl.Manager
	Logger                *logger.Logger
	HasGpuNode            bool

	// TODO: need init
	UserContactProvider     usernotify.UserContactProvider
	UserNotificationService usernotify.EventNotificationService

	SendDebtStatusEmailBody map[types.DebtStatusType]string
	// Debug                bool
)

func Init(ctx context.Context) error {
	BillingTask = helper.NewTaskQueue(
		ctx,
		env.GetIntEnvWithDefault("ACTIVE_BILLING_TASK_WORKER_COUNT", 10),
		env.GetIntEnvWithDefault("ACTIVE_BILLING_TASK_QUEUE_SIZE", 10000),
	)
	var err error
	globalCockroach := os.Getenv(helper.ENVGlobalCockroach)
	if globalCockroach == "" {
		return fmt.Errorf(
			"empty global cockroach uri, please check env: %s",
			helper.ENVGlobalCockroach,
		)
	}
	localCockroach := os.Getenv(helper.ENVLocalCockroach)
	if localCockroach == "" {
		return fmt.Errorf(
			"empty local cockroach uri, please check env: %s",
			helper.ENVLocalCockroach,
		)
	}
	mongoURI := os.Getenv(helper.EnvMongoURI)
	if mongoURI == "" {
		return fmt.Errorf("empty mongo uri, please check env: %s", helper.EnvMongoURI)
	}
	// Debug = os.Getenv("DEBUG") == "true"
	DBClient, err = NewAccountInterface(mongoURI, globalCockroach, localCockroach)
	if err != nil {
		return err
	}
	if _, err = DBClient.GetProperties(); err != nil {
		return fmt.Errorf("get properties error: %w", err)
	}
	// init region env
	err = database.InitRegionEnv(DBClient.GetGlobalDB(), DBClient.GetLocalRegion().Domain)
	if err != nil {
		return fmt.Errorf("init region env error: %w", err)
	}
	file := helper.ConfigPath
	Cfg = &Config{} // Initialize Cfg regardless of file existence
	if _, err := os.Stat(file); err == nil {
		data, err := os.ReadFile(file)
		if err != nil {
			return fmt.Errorf("read config file error: %w", err)
		}
		fmt.Printf("config file found, use config file: \n%s\n", file)

		// json unmarshal
		if err = json.Unmarshal(data, Cfg); err != nil {
			return fmt.Errorf("unmarshal config file error: %w", err)
		}
	}
	if len(Cfg.Regions) == 0 {
		regions, err := DBClient.GetRegions()
		if err != nil {
			return fmt.Errorf("get regions error: %w", err)
		}
		Cfg = &Config{
			Regions: make([]Region, 0),
		}
		for i := range regions {
			Cfg.Regions = append(Cfg.Regions, Region{
				Domain:     regions[i].Domain,
				AccountSvc: "account-api." + regions[i].Domain,
				UID:        regions[i].UID.String(),
				Name: map[string]string{
					"zh": regions[i].DisplayName,
					"en": regions[i].DisplayName,
				},
			})
		}
	}
	Cfg.LocalRegionDomain = DBClient.GetLocalRegion().Domain
	Logger = logger.NewFeishuLogger(
		nil,
		os.Getenv("FEISHU_WEBHOOK"),
		logger.INFO,
		Cfg.LocalRegionDomain+"-account-service",
	)
	fmt.Println("region-info: ", Cfg)
	jwtSecret := os.Getenv(helper.EnvJwtSecret)
	if jwtSecret == "" {
		return fmt.Errorf("empty jwt secret env: %s", helper.EnvJwtSecret)
	}
	JwtMgr = utils.NewJWTManager(os.Getenv(helper.EnvJwtSecret), time.Minute*30)

	gatewayURL, clientID, privateKey, publicKey := os.Getenv(
		helper.EnvAlipayGatewayURL,
	), os.Getenv(
		helper.EnvAlipayClientID,
	), os.Getenv(
		helper.EnvAlipayPrivateKey,
	), os.Getenv(
		helper.EnvAlipayPublicKey,
	)
	if gatewayURL != "" && clientID != "" && privateKey != "" && publicKey != "" {
		fmt.Printf("init alipay client with gatewayUrl: %s, clientID: %s\n", gatewayURL, clientID)
		if Cfg.LocalRegionDomain == "" {
			return errors.New("empty local region domain, please check config")
		}
		payNotificationURL := "https://" + "account-api." + Cfg.LocalRegionDomain
		if err != nil {
			return fmt.Errorf("join pay notification url error: %w", err)
		}
		payRedirectURL := "https://" + "account-center." + Cfg.LocalRegionDomain
		fmt.Printf(
			"init alipay client with payNotificationURL: %s , payRedirectURL: %s\n",
			payNotificationURL,
			payRedirectURL,
		)
		PaymentService = services.NewPaymentService(
			defaultAlipayClient.NewDefaultAlipayClient(gatewayURL, clientID, privateKey, publicKey),
			payNotificationURL,
			payRedirectURL,
		)
		ClientIP, DeviceTokenID = os.Getenv(helper.EnvClientIP), os.Getenv(helper.EnvDeviceTokenID)
		if ClientIP == "" {
			return fmt.Errorf("empty client ip, please check env: %s", helper.EnvClientIP)
		}
	}
	if PaymentCurrency = os.Getenv(helper.EnvPaymentCurrency); PaymentCurrency == "" {
		PaymentCurrency = "USD"
	}
	if os.Getenv(helper.EnvSubscriptionEnabled) == "true" {
		plans, err := DBClient.GetSubscriptionPlanList()
		if err != nil {
			return fmt.Errorf("get subscription plan list error: %w", err)
		}
		SubPlanResourceQuota, err = resources.ParseResourceLimitWithPlans(plans)
		if err != nil {
			return fmt.Errorf("parse resource limit with subscription error: %w", err)
		}
		FlushQuotaProcesser = &FlushQuotaTask{
			LocalDomain: Cfg.LocalRegionDomain,
		}
	}
	workspacePlans, err := DBClient.GetWorkspaceSubscriptionPlanList()
	if err != nil {
		return fmt.Errorf("get workspace subscription plan list error: %w", err)
	}
	WorkspacePlanResQuota, err = resources.ParseResourceLimitWithPlans(workspacePlans)
	if err != nil {
		return fmt.Errorf("parse resource limit with workspace subscription error: %w", err)
	}

	notifyConfigStr := os.Getenv(helper.EnvNotifyConfig)
	if notifyConfigStr != "" {
		notifyConfig, err := usernotify.ParseConfigsWithJSON(notifyConfigStr)
		if err != nil {
			return fmt.Errorf("parse notify config error: %w", err)
		}
		UserContactProvider = usernotify.NewMemoryContactProvider()
		UserNotificationService = usernotify.NewEventNotificationService(
			notifyConfig,
			UserContactProvider,
		)
	} else {
		logrus.Errorf("empty notify config env: %s, user notification service disabled", helper.EnvNotifyConfig)
	}

	EmailTmplMap = map[string]string{
		utils.EnvPaySuccessEmailTmpl: os.Getenv(utils.EnvPaySuccessEmailTmpl),
		utils.EnvPayFailedEmailTmpl:  os.Getenv(utils.EnvPayFailedEmailTmpl),
		utils.EnvSubSuccessEmailTmpl: os.Getenv(utils.EnvSubSuccessEmailTmpl),
		utils.EnvSubFailedEmailTmpl:  os.Getenv(utils.EnvSubFailedEmailTmpl),
	}
	SMTPConfig = &utils.SMTPConfig{
		ServerHost: os.Getenv(utils.EnvSMTPHost),
		ServerPort: env.GetIntEnvWithDefault(utils.EnvSMTPPort, 465),
		FromEmail:  os.Getenv(utils.EnvSMTPFrom),
		Username:   env.GetEnvWithDefault(utils.EnvSMTPUser, os.Getenv(utils.EnvSMTPFrom)),
		Passwd:     os.Getenv(utils.EnvSMTPPassword),
		EmailTitle: os.Getenv(utils.EnvSMTPTitle),
	}
	setDefaultDebtPeriodWaitSecond()
	SetDebtConfig()
	scheme := runtime.NewScheme()
	utilruntime.Must(clientgoscheme.AddToScheme(scheme))
	utilruntime.Must(corev1.AddToScheme(scheme))
	utilruntime.Must(v1.AddToScheme(scheme))

	K8sManager, err = ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
		Scheme: scheme,
	})
	if err != nil {
		return fmt.Errorf("unable to start manager: %w", err)
	}
	if err = SetupCache(K8sManager); err != nil {
		return fmt.Errorf("setup cache error: %w", err)
	}

	// Initialize Stripe service if configured
	services.InitStripeService()

	// Start manager in background
	go func() {
		if err := K8sManager.Start(ctrl.SetupSignalHandler()); err != nil {
			logrus.Errorf("unable to start manager: %v", err)
			os.Exit(1)
		}
	}()

	// Wait for cache to sync before reading objects
	if !K8sManager.GetCache().WaitForCacheSync(ctx) {
		return errors.New("failed to wait for cache sync")
	}

	// Now it's safe to read objects
	HasGpuNode, err = gpu.GetGpuNodeExist(K8sManager.GetClient())
	if err != nil {
		return fmt.Errorf("check gpu node exist error: %w", err)
	}
	return nil
}

const UserOwnerLabel = "user.sealos.io/owner"

func SetupCache(mgr ctrl.Manager) error {
	ns := &corev1.Namespace{}
	nsNameFunc := func(obj client.Object) []string {
		_ns, ok := obj.(*corev1.Namespace)
		if !ok {
			return []string{}
		}
		return []string{_ns.Name}
	}
	nsOwnerFunc := func(obj client.Object) []string {
		_ns, ok := obj.(*corev1.Namespace)
		if !ok {
			return []string{}
		}
		return []string{_ns.Labels[UserOwnerLabel]}
	}

	for _, idx := range []struct {
		obj          client.Object
		field        string
		extractValue client.IndexerFunc
	}{
		{ns, accountv1.Name, nsNameFunc},
		{ns, accountv1.Owner, nsOwnerFunc},
	} {
		if err := mgr.GetFieldIndexer().IndexField(context.TODO(), idx.obj, idx.field, idx.extractValue); err != nil {
			return err
		}
	}
	return nil
}

var (
	TitleTemplateZHMap = map[types.DebtStatusType]string{
		types.LowBalancePeriod:      "余额不足",
		types.CriticalBalancePeriod: "余额即将耗尽",
		types.DebtPeriod:            "余额耗尽",
		types.DebtDeletionPeriod:    "即将资源释放",
		types.FinalDeletionPeriod:   "彻底资源释放",
	}
	TitleTemplateENMap = map[types.DebtStatusType]string{
		types.LowBalancePeriod:      "Low Balance",
		types.CriticalBalancePeriod: "Critical Balance",
		types.DebtPeriod:            "Debt",
		types.DebtDeletionPeriod:    "Imminent Resource Release",
		types.FinalDeletionPeriod:   "Radical resource release",
	}
	NoticeTemplateENMap map[types.DebtStatusType]string
	NoticeTemplateZHMap map[types.DebtStatusType]string
	EmailTemplateENMap  map[types.DebtStatusType]string
	EmailTemplateZHMap  map[types.DebtStatusType]string
)

func setDefaultDebtPeriodWaitSecond() {
	domain := os.Getenv("DOMAIN")
	NoticeTemplateZHMap = map[types.DebtStatusType]string{
		types.LowBalancePeriod:      "当前工作空间所属账户余额过低，请及时充值，以免影响您的正常使用。",
		types.CriticalBalancePeriod: "当前工作空间所属账户余额即将耗尽，请及时充值，以免影响您的正常使用。",
		types.DebtPeriod:            "当前工作空间所属账户余额已耗尽，系统将为您暂停服务，请及时充值，以免影响您的正常使用。",
		types.DebtDeletionPeriod:    "系统即将释放当前空间的资源，请及时充值，以免影响您的正常使用。",
		types.FinalDeletionPeriod:   "系统将随时彻底释放当前工作空间所属账户下的所有资源，请及时充值，以免影响您的正常使用。",
	}
	NoticeTemplateENMap = map[types.DebtStatusType]string{
		types.LowBalancePeriod:      "Your account balance is too low, please recharge in time to avoid affecting your normal use.",
		types.CriticalBalancePeriod: "Your account balance is about to run out, please recharge in time to avoid affecting your normal use.",
		types.DebtPeriod:            "Your account balance has been exhausted, and services will be suspended for you. Please recharge in time to avoid affecting your normal use.",
		types.DebtDeletionPeriod:    "The system will release the resources of the current space soon. Please recharge in time to avoid affecting your normal use.",
		types.FinalDeletionPeriod:   "The system will completely release all resources under the current account at any time. Please recharge in time to avoid affecting your normal use.",
	}
	EmailTemplateZHMap, EmailTemplateENMap = make(
		map[types.DebtStatusType]string,
	), make(
		map[types.DebtStatusType]string,
	)
	for _, i := range []types.DebtStatusType{types.LowBalancePeriod, types.CriticalBalancePeriod, types.DebtPeriod, types.DebtDeletionPeriod, types.FinalDeletionPeriod} {
		EmailTemplateENMap[i] = TitleTemplateENMap[i] + "：" + NoticeTemplateENMap[i] + "(" + domain + ")"
		EmailTemplateZHMap[i] = TitleTemplateZHMap[i] + "：" + NoticeTemplateZHMap[i] + "(" + domain + ")"
	}
}

func SetDebtConfig() {
	SendDebtStatusEmailBody = make(map[types.DebtStatusType]string)
	for _, status := range []types.DebtStatusType{types.LowBalancePeriod, types.CriticalBalancePeriod, types.DebtPeriod, types.DebtDeletionPeriod, types.FinalDeletionPeriod} {
		email := os.Getenv(string(status) + "EmailBody")
		if email == "" {
			email = EmailTemplateZHMap[status] + "\n" + EmailTemplateENMap[status]
		} else {
			logrus.Info("email body is not empty, use env: ", email, " for status: ", status)
		}
		SendDebtStatusEmailBody[status] = email
	}
}
