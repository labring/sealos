package helper

const (
	GROUP                         = "/account/v1alpha1"
	GetAccount                    = "/account"
	GetPayment                    = "/payment"
	GetHistoryNamespaces          = "/namespaces"
	GetProperties                 = "/properties"
	GetRechargeAmount             = "/costs/recharge"
	GetConsumptionAmount          = "/costs/consumption"
	GetAllRegionConsumptionAmount = "/costs/all-region-consumption"
	GetPropertiesUsed             = "/costs/properties"
	GetAPPCosts                   = "/costs/app"
	GetAppTypeCosts               = "/costs/app-type"
	SetPaymentInvoice             = "/payment/set-invoice"
	GetUserCosts                  = "/costs"
	SetTransfer                   = "/transfer"
	GetTransfer                   = "/get-transfer"
	GetRegions                    = "/regions"
	GetOverview                   = "/cost-overview"
	GetAppList                    = "/cost-app-list"
	GetAppTypeList                = "/cost-app-type-list"
	GetBasicCostDistribution      = "/cost-basic-distribution"
	GetAppCostTimeRange           = "/cost-app-time-range"
	CheckPermission               = "/check-permission"
	GetInvoice                    = "/invoice/get"
	ApplyInvoice                  = "/invoice/apply"
	SetStatusInvoice              = "/invoice/set-status"
	GetInvoicePayment             = "/invoice/get-payment"
	UseGiftCode                   = "/gift-code/use"
	UserUsage                     = "/user-usage"
	GetRechargeDiscount           = "/recharge-discount"
	GetUserRealNameInfo           = "/real-name-info"
)

const (
	AdminGroup                   = "/admin/v1alpha1"
	AdminGetAccountWithWorkspace = "/account-with-workspace"
	AdminChargeBilling           = "/charge-billing"
	AdminActiveBilling           = "/active-billing"
	AdminGetUserRealNameInfo     = "/real-name-info"
	AdminFlushSubQuota           = "/flush-sub-quota"
	AdminFlushDebtResourceStatus = "/flush-debt-resource-status"
	AdminSuspendUserTraffic      = "/suspend-user-traffic"
	AdminResumeUserTraffic       = "/resume-user-traffic"
)

const (
	PaymentGroup                = "/payment/v1alpha1"
	CreatePay                   = "/pay"
	Notify                      = "/notify"
	SubscriptionUserInfo        = "/subscription/user-info"
	SubscriptionPlanList        = "/subscription/plan-list"
	SubscriptionLastTransaction = "/subscription/last-transaction"
	SubscriptionUpgradeAmount   = "/subscription/upgrade-amount"
	SubscriptionFlushQuota      = "/subscription/flush-quota"
	SubscriptionQuotaCheck      = "/subscription/quota-check"
	SubscriptionNotify          = "/subscription/notify"
	SubscriptionPay             = "/subscription/pay"
	CardList                    = "/card/list"
	CardDelete                  = "/card/delete"
	CardSetDefault              = "/card/set-default"
	CreditsList                 = "/credits/list"
	CreditsInfo                 = "/credits/info"
)

const PayNotificationPath = PaymentGroup + Notify

// env
const (
	ConfigPath         = "/config/config.json"
	EnvMongoURI        = "MONGO_URI"
	EnvClientIP        = "CLIENT_IP"
	EnvDeviceTokenID   = "DEVICE_TOKEN_ID"
	ENVGlobalCockroach = "GLOBAL_COCKROACH_URI"
	ENVLocalCockroach  = "LOCAL_COCKROACH_URI"
	EnvLocalRegion     = "LOCAL_REGION"
	EnvJwtSecret       = "ACCOUNT_API_JWT_SECRET"

	EnvSubscriptionEnabled = "SUBSCRIPTION_ENABLED"
	EnvKycProcessEnabled   = "KYC_PROCESS_ENABLED"
)

const (
	EnvAlipayGatewayURL = "ALIPAY_GATEWAY_URL"
	EnvAlipayClientID   = "ALIPAY_CLIENT_ID"
	EnvAlipayPublicKey  = "ALIPAY_PUBLIC_KEY"
	EnvAlipayPrivateKey = "ALIPAY_PRIVATE_KEY"

	EnvPaymentCurrency = "PAYMENT_CURRENCY"
)
