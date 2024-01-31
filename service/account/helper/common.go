package helper

const (
	GROUP                = "/account/v1alpha1"
	GetAccount           = "/account"
	GetHistoryNamespaces = "/namespaces"
	GetProperties        = "/properties"
	GetRechargeAmount    = "/costs/recharge"
	GetConsumptionAmount = "/costs/consumption"
	GetPropertiesUsed    = "/costs/properties"
	GetUserCosts         = "/costs"
)

// env
const (
	EnvMongoURI        = "MONGO_URI"
	ENVGlobalCockroach = "GLOBAL_COCKROACH_URI"
	ENVLocalCockroach  = "LOCAL_COCKROACH_URI"
	EnvLocalRegion     = "LOCAL_REGION"
)
