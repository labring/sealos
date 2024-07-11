package helper

const (
	GROUP                = "/account/v1alpha1"
	GetAccount           = "/account"
	GetPayment           = "/payment"
	GetHistoryNamespaces = "/namespaces"
	GetProperties        = "/properties"
	GetRechargeAmount    = "/costs/recharge"
	GetConsumptionAmount = "/costs/consumption"
	GetPropertiesUsed    = "/costs/properties"
	GetAPPCosts          = "/costs/app"
	SetPaymentInvoice    = "/payment/set-invoice"
	GetUserCosts         = "/costs"
	SetTransfer          = "/transfer"
	GetTransfer          = "/get-transfer"
)

// env
const (
	EnvMongoURI        = "MONGO_URI"
	ENVGlobalCockroach = "GLOBAL_COCKROACH_URI"
	ENVLocalCockroach  = "LOCAL_COCKROACH_URI"
	EnvLocalRegion     = "LOCAL_REGION"
)
