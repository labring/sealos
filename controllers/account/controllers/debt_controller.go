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

// const (
//	DebtDetectionCycleEnv = "DebtDetectionCycleSeconds"
//
//	SMSAccessKeyIDEnv     = "SMS_AK"
//	SMSAccessKeySecretEnv = "SMS_SK"
//	VmsAccessKeyIDEnv     = "VMS_AK"
//	VmsAccessKeySecretEnv = "VMS_SK"
//	SMSEndpointEnv        = "SMS_ENDPOINT"
//	SMSSignNameEnv        = "SMS_SIGN_NAME"
//	SMSCodeMapEnv         = "SMS_CODE_MAP"
//	VmsCodeMapEnv         = "VMS_CODE_MAP"
//	VmsNumberPollEnv      = "VMS_NUMBER_POLL"
//	SMTPHostEnv           = "SMTP_HOST"
//	SMTPPortEnv           = "SMTP_PORT"
//	SMTPFromEnv           = "SMTP_FROM"
//	SMTPUserEnv           = "SMTP_USER"
//	SMTPPasswordEnv       = "SMTP_PASSWORD"
//	SMTPTitleEnv          = "SMTP_TITLE"
//)
//
//// DebtReconciler reconciles a Debt object
// type DebtReconciler struct {
//	client.Client
//	*AccountReconciler
//	AccountV2           database.AccountV2
//	InitUserAccountFunc func(user *pkgtypes.UserQueryOpts) (*pkgtypes.Account, error)
//	Scheme              *runtime.Scheme
//	DebtDetectionCycle  time.Duration
//	LocalRegionID       string
//	logr.Logger
//	accountSystemNamespace string
//	SmsConfig              *SmsConfig
//	VmsConfig              *VmsConfig
//	smtpConfig             *utils.SMTPConfig
//	DebtUserMap            *maps.ConcurrentMap
//	// TODO need init
//	userLocks                   *sync.Map
//	failedUserLocks             *sync.Map
//	processID                   string
//	SkipExpiredUserTimeDuration time.Duration
//	SendDebtStatusEmailBody     map[accountv1.DebtStatusType]string
//}
//
// type VmsConfig struct {
//	TemplateCode map[string]string
//	NumberPoll   string
//}
//
//type SmsConfig struct {
//	Client      *client2.Client
//	SmsSignName string
//	SmsCode     map[string]string
//}
//
//var DebtConfig = accountv1.DefaultDebtConfig
//
//func (r *DebtReconciler) DetermineCurrentStatus(oweamount int64, userUID uuid.UUID, updateIntervalSeconds int64, lastStatus accountv1.DebtStatusType) (accountv1.DebtStatusType, error) {
//	if SubscriptionEnabled {
//		return r.determineCurrentStatusWithSubscription(oweamount, userUID, updateIntervalSeconds, lastStatus)
//	}
//	return determineCurrentStatus(oweamount, updateIntervalSeconds, lastStatus), nil
//}
//
//func (r *DebtReconciler) determineCurrentStatusWithSubscription(oweamount int64, userUID uuid.UUID, updateIntervalSeconds int64, lastStatus accountv1.DebtStatusType) (accountv1.DebtStatusType, error) {
//	userSubscription, err := r.AccountV2.GetSubscription(&pkgtypes.UserQueryOpts{UID: userUID})
//	if err != nil {
//		return accountv1.NormalPeriod, fmt.Errorf("failed to get user subscription: %w", err)
//	}
//
//	if oweamount > 0 && userSubscription.Status == pkgtypes.SubscriptionStatusNormal {
//		if oweamount >= 5*BaseUnit {
//			return accountv1.NormalPeriod, nil
//		} else if oweamount > 1*BaseUnit {
//			return accountv1.LowBalancePeriod, nil
//		}
//		return accountv1.CriticalBalancePeriod, nil
//	}
//	if lastStatus == accountv1.NormalPeriod || lastStatus == accountv1.LowBalancePeriod || lastStatus == accountv1.CriticalBalancePeriod {
//		return accountv1.DebtPeriod, nil
//	}
//	if lastStatus == accountv1.DebtPeriod && updateIntervalSeconds >= DebtConfig[accountv1.DebtDeletionPeriod] {
//		return accountv1.DebtDeletionPeriod, nil
//	}
//	if lastStatus == accountv1.DebtDeletionPeriod && updateIntervalSeconds >= DebtConfig[accountv1.FinalDeletionPeriod] {
//		return accountv1.FinalDeletionPeriod, nil
//	}
//	return lastStatus, nil // Maintain current debt state if no transition
//}
//
//func determineCurrentStatus(oweamount int64, updateIntervalSeconds int64, lastStatus accountv1.DebtStatusType) accountv1.DebtStatusType {
//	if oweamount > 0 {
//		if oweamount > 10*BaseUnit {
//			return accountv1.NormalPeriod
//		} else if oweamount > 5*BaseUnit {
//			return accountv1.LowBalancePeriod
//		}
//		return accountv1.CriticalBalancePeriod
//	}
//	if lastStatus == accountv1.NormalPeriod || lastStatus == accountv1.LowBalancePeriod || lastStatus == accountv1.CriticalBalancePeriod {
//		return accountv1.DebtPeriod
//	}
//	if lastStatus == accountv1.DebtPeriod && updateIntervalSeconds >= DebtConfig[accountv1.DebtDeletionPeriod] {
//		return accountv1.DebtDeletionPeriod
//	}
//	if lastStatus == accountv1.DebtDeletionPeriod && updateIntervalSeconds >= DebtConfig[accountv1.FinalDeletionPeriod] {
//		return accountv1.FinalDeletionPeriod
//	}
//	return lastStatus // Maintain current debt state if no transition
//}
//
//const (
//	fromEn = "Debt-System"
//	fromZh = "欠费系统"
//	//languageEn = "en"
//	languageZh       = "zh"
//	debtChoicePrefix = "debt-choice-"
//	readStatusLabel  = "isRead"
//	falseStatus      = "false"
//	trueStatus       = "true"
//)
//
//var (
//	TitleTemplateZHMap = map[accountv1.DebtStatusType]string{
//		accountv1.LowBalancePeriod:      "余额不足",
//		accountv1.CriticalBalancePeriod: "余额即将耗尽",
//		accountv1.DebtPeriod:            "余额耗尽",
//		accountv1.DebtDeletionPeriod:    "即将资源释放",
//		accountv1.FinalDeletionPeriod:   "彻底资源释放",
//	}
//	TitleTemplateENMap = map[accountv1.DebtStatusType]string{
//		accountv1.LowBalancePeriod:      "Low Balance",
//		accountv1.CriticalBalancePeriod: "Critical Balance",
//		accountv1.DebtPeriod:            "Debt",
//		accountv1.DebtDeletionPeriod:    "Imminent Resource Release",
//		accountv1.FinalDeletionPeriod:   "Radical resource release",
//	}
//	NoticeTemplateENMap map[accountv1.DebtStatusType]string
//	NoticeTemplateZHMap map[accountv1.DebtStatusType]string
//	EmailTemplateENMap  map[accountv1.DebtStatusType]string
//	EmailTemplateZHMap  map[accountv1.DebtStatusType]string
//)
//
//var (
//	forbidTimes = []string{"00:00-10:00", "20:00-24:00"}
//	UTCPlus8    = time.FixedZone("UTC+8", 8*3600)
//)
//
//// GetSendVmsTimeInUTCPlus8 send vms time in UTC+8 10:00-20:00
//func GetSendVmsTimeInUTCPlus8(t time.Time) time.Time {
//	nowInUTCPlus8 := t.In(UTCPlus8)
//	hour := nowInUTCPlus8.Hour()
//	if hour >= 10 && hour < 20 {
//		return t
//	}
//	var next10AM time.Time
//	if hour < 10 {
//		next10AM = time.Date(nowInUTCPlus8.Year(), nowInUTCPlus8.Month(), nowInUTCPlus8.Day(), 10, 0, 0, 0, UTCPlus8)
//	} else {
//		next10AM = time.Date(nowInUTCPlus8.Year(), nowInUTCPlus8.Month(), nowInUTCPlus8.Day()+1, 10, 0, 0, 0, UTCPlus8)
//	}
//	return next10AM.In(time.Local)
//}
//
//// convert "1:code1,2:code2" to map[int]string
//func splitSmsCodeMap(codeStr string) (map[string]string, error) {
//	codeMap := make(map[string]string)
//	for _, code := range strings.Split(codeStr, ",") {
//		split := strings.SplitN(code, ":", 2)
//		if len(split) != 2 {
//			return nil, fmt.Errorf("invalid sms code map: %s", codeStr)
//		}
//		codeMap[split[0]] = split[1]
//	}
//	return codeMap, nil
//}
//
//func (r *DebtReconciler) setupSmsConfig() error {
//	if err := env.CheckEnvSetting([]string{SMSAccessKeyIDEnv, SMSAccessKeySecretEnv, SMSEndpointEnv, SMSSignNameEnv, SMSCodeMapEnv}); err != nil {
//		return fmt.Errorf("check env setting error: %w", err)
//	}
//
//	smsCodeMap, err := splitSmsCodeMap(os.Getenv(SMSCodeMapEnv))
//	if err != nil {
//		return fmt.Errorf("split sms code map error: %w", err)
//	}
//	for key := range smsCodeMap {
//		if _, ok := pkgtypes.StatusMap[pkgtypes.DebtStatusType(key)]; !ok {
//			return fmt.Errorf("invalid sms code map key: %s", key)
//		}
//	}
//	r.Logger.Info("set sms code map", "smsCodeMap", smsCodeMap, "smsSignName", os.Getenv(SMSSignNameEnv))
//	smsClient, err := utils.CreateSMSClient(os.Getenv(SMSAccessKeyIDEnv), os.Getenv(SMSAccessKeySecretEnv), os.Getenv(SMSEndpointEnv))
//	if err != nil {
//		return fmt.Errorf("create sms client error: %w", err)
//	}
//	r.SmsConfig = &SmsConfig{
//		Client:      smsClient,
//		SmsSignName: os.Getenv(SMSSignNameEnv),
//		SmsCode:     smsCodeMap,
//	}
//	return nil
//}
//
//func (r *DebtReconciler) setupVmsConfig() error {
//	if err := env.CheckEnvSetting([]string{VmsAccessKeyIDEnv, VmsAccessKeySecretEnv, VmsNumberPollEnv}); err != nil {
//		return fmt.Errorf("check env setting error: %w", err)
//	}
//	vms.DefaultInstance.Client.SetAccessKey(os.Getenv(VmsAccessKeyIDEnv))
//	vms.DefaultInstance.Client.SetSecretKey(os.Getenv(VmsAccessKeySecretEnv))
//
//	vmsCodeMap, err := splitSmsCodeMap(os.Getenv(VmsCodeMapEnv))
//	if err != nil {
//		return fmt.Errorf("split vms code map error: %w", err)
//	}
//	for key := range vmsCodeMap {
//		if _, ok := pkgtypes.StatusMap[pkgtypes.DebtStatusType(key)]; !ok {
//			return fmt.Errorf("invalid sms code map key: %s", key)
//		}
//	}
//	r.Logger.Info("set vms code map", "vmsCodeMap", vmsCodeMap)
//	r.VmsConfig = &VmsConfig{
//		TemplateCode: vmsCodeMap,
//		NumberPoll:   os.Getenv(VmsNumberPollEnv),
//	}
//	return nil
//}
//
//func (r *DebtReconciler) setupSMTPConfig() error {
//	if err := env.CheckEnvSetting([]string{SMTPHostEnv, SMTPFromEnv, SMTPPasswordEnv, SMTPTitleEnv}); err != nil {
//		return fmt.Errorf("check env setting error: %w", err)
//	}
//	serverPort, err := strconv.Atoi(env.GetEnvWithDefault(SMTPPortEnv, "465"))
//	if err != nil {
//		return fmt.Errorf("invalid smtp port: %w", err)
//	}
//	r.smtpConfig = &utils.SMTPConfig{
//		ServerHost: os.Getenv(SMTPHostEnv),
//		ServerPort: serverPort,
//		Username:   env.GetEnvWithDefault(SMTPUserEnv, os.Getenv(SMTPFromEnv)),
//		FromEmail:  os.Getenv(SMTPFromEnv),
//		Passwd:     os.Getenv(SMTPPasswordEnv),
//		EmailTitle: os.Getenv(SMTPTitleEnv),
//	}
//	return nil
//}
//
//// SetupWithManager sets up the controller with the Manager.
//func (r *DebtReconciler) SetupWithManager(mgr ctrl.Manager, rateOpts controller.Options) error {
//	r.Init()
//	/*
//		{"DebtConfig":{
//		"ApproachingDeletionPeriod":345600,
//		"FinalDeletionPeriod":604800,
//		"ImminentDeletionPeriod":259200,"WarningPeriod":0},
//		"DebtDetectionCycle": "1m0s",
//		"accountSystemNamespace": "account-system",
//		"accountNamespace": "sealos-system"}
//	*/
//	r.Logger.Info("set config", "DebtConfig", DebtConfig, "DebtDetectionCycle", r.DebtDetectionCycle,
//		"accountSystemNamespace", r.accountSystemNamespace)
//	return ctrl.NewControllerManagedBy(mgr).
//		For(&userv1.User{}, builder.WithPredicates(predicate.And(UserOwnerPredicate{})), builder.OnlyMetadata).
//		Watches(&accountv1.Payment{}, &handler.EnqueueRequestForObject{}).
//		WithOptions(rateOpts).
//		Complete(r)
//}
//
//func (r *DebtReconciler) Init() {
//	r.Logger = ctrl.Log.WithName("DebtController")
//	r.accountSystemNamespace = env.GetEnvWithDefault(accountv1.AccountSystemNamespaceEnv, "account-system")
//	r.LocalRegionID = os.Getenv(cockroach.EnvLocalRegion)
//	debtDetectionCycleSecond := env.GetInt64EnvWithDefault(DebtDetectionCycleEnv, 1800)
//	r.DebtDetectionCycle = time.Duration(debtDetectionCycleSecond) * time.Second
//	r.userLocks = &sync.Map{}
//	r.failedUserLocks = &sync.Map{}
//	r.processID = uuid.NewString()
//
//	setupList := []func() error{
//		r.setupSmsConfig,
//		r.setupVmsConfig,
//		r.setupSMTPConfig,
//	}
//	for i := range setupList {
//		if err := setupList[i](); err != nil {
//			r.Logger.Error(err, fmt.Sprintf("failed to set up %s", runtime2.FuncForPC(reflect.ValueOf(setupList[i]).Pointer()).Name()))
//		}
//	}
//	setDefaultDebtPeriodWaitSecond()
//	r.SendDebtStatusEmailBody = make(map[accountv1.DebtStatusType]string)
//	for _, status := range []accountv1.DebtStatusType{accountv1.LowBalancePeriod, accountv1.CriticalBalancePeriod, accountv1.DebtPeriod, accountv1.DebtDeletionPeriod, accountv1.FinalDeletionPeriod} {
//		email := os.Getenv(string(status) + "EmailBody")
//		if email == "" {
//			email = EmailTemplateZHMap[status] + "\n" + EmailTemplateENMap[status]
//		} else {
//			r.Logger.Info("set email body", "status", status, "body", email)
//		}
//		r.SendDebtStatusEmailBody[status] = email
//	}
//	r.Logger.Info("debt config", "DebtConfig", DebtConfig, "DebtDetectionCycle", r.DebtDetectionCycle)
//}
//
//func setDefaultDebtPeriodWaitSecond() {
//	DebtConfig[accountv1.DebtDeletionPeriod] = env.GetInt64EnvWithDefault(string(accountv1.DebtDeletionPeriod), 7*accountv1.DaySecond)
//	DebtConfig[accountv1.FinalDeletionPeriod] = env.GetInt64EnvWithDefault(string(accountv1.FinalDeletionPeriod), 7*accountv1.DaySecond)
//	domain := os.Getenv("DOMAIN")
//	NoticeTemplateZHMap = map[accountv1.DebtStatusType]string{
//		accountv1.LowBalancePeriod:      "当前工作空间所属账户余额过低，请及时充值，以免影响您的正常使用。",
//		accountv1.CriticalBalancePeriod: "当前工作空间所属账户余额即将耗尽，请及时充值，以免影响您的正常使用。",
//		accountv1.DebtPeriod:            "当前工作空间所属账户余额已耗尽，系统将为您暂停服务，请及时充值，以免影响您的正常使用。",
//		accountv1.DebtDeletionPeriod:    "系统即将释放当前空间的资源，请及时充值，以免影响您的正常使用。",
//		accountv1.FinalDeletionPeriod:   "系统将随时彻底释放当前工作空间所属账户下的所有资源，请及时充值，以免影响您的正常使用。",
//	}
//	NoticeTemplateENMap = map[accountv1.DebtStatusType]string{
//		accountv1.LowBalancePeriod:      "Your account balance is too low, please recharge in time to avoid affecting your normal use.",
//		accountv1.CriticalBalancePeriod: "Your account balance is about to run out, please recharge in time to avoid affecting your normal use.",
//		accountv1.DebtPeriod:            "Your account balance has been exhausted, and services will be suspended for you. Please recharge in time to avoid affecting your normal use.",
//		accountv1.DebtDeletionPeriod:    "The system will release the resources of the current space soon. Please recharge in time to avoid affecting your normal use.",
//		accountv1.FinalDeletionPeriod:   "The system will completely release all resources under the current account at any time. Please recharge in time to avoid affecting your normal use.",
//	}
//	EmailTemplateZHMap, EmailTemplateENMap = make(map[accountv1.DebtStatusType]string), make(map[accountv1.DebtStatusType]string)
//	for _, i := range []accountv1.DebtStatusType{accountv1.LowBalancePeriod, accountv1.CriticalBalancePeriod, accountv1.DebtPeriod, accountv1.DebtDeletionPeriod, accountv1.FinalDeletionPeriod} {
//		EmailTemplateENMap[i] = TitleTemplateENMap[i] + "：" + NoticeTemplateENMap[i] + "(" + domain + ")"
//		EmailTemplateZHMap[i] = TitleTemplateZHMap[i] + "：" + NoticeTemplateZHMap[i] + "(" + domain + ")"
//	}
//}
//
//type UserOwnerPredicate struct {
//	predicate.Funcs
//}
//
//func (UserOwnerPredicate) Create(e event.CreateEvent) bool {
//	owner := e.Object.GetAnnotations()[userv1.UserAnnotationOwnerKey]
//	return owner != "" && owner == e.Object.GetName()
//}
//
//func (UserOwnerPredicate) Update(_ event.UpdateEvent) bool {
//	return false
//}
