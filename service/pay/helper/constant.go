package helper

// DB
const (
	DBURI = "dburi"
	// TODO the database needs a new name
	Database           = "xy"
	AppColl            = "app"
	PayMethodColl      = "paymethod"
	PaymentDetailsColl = "paymentdetails"
	OrderDetailsColl   = "orderdetails"
)

// Paymethod
const (
	Wechat = "wechat"
	Alipay = "alipay"
	Stripe = "stripe"
)

// TLS
const (
	Cert = "/path/to/certificates/tls.crt"
	Key  = "/path/to/certificates/tls.key"
)

// stripe
const (
	DefaultPort   string = "443"
	DefaultDomain string = "cloud.sealos.io"
)
const (
	StripeSuccessPostfix = "STRIPE_SUCCESS_POSTFIX"
	StripeCancelPostfix  = "STRIPE_CANCEL_POSTFIX"
	StripeCurrency       = "STRIPE_CURRENCY"
)

// Test
const (
	LOCALHOST       = "http://localhost:2303"
	DNS             = "https://coqveoktbleo.dev.sealos.top"
	GROUP           = "/v1alpha1/pay"
	CreatePayMethod = "/method"
	CreatePayApp    = "/app"
	GetAppDetails   = "/details"
	GetSession      = "/session"
	GetPayStatus    = "/status"
	GetBill         = "/bill"
	TestAppID       = 66683568733697785
	TestSign        = "597d7f10a27219"
	TestUser        = "xy"
	TestOrderID     = "8QC6mu7vSNJckVhpKv"
	TestSessionID   = "cs_test_a1vbMHEx4iVfIWPoiJVVbBd7eecKDw8CDdJoLc7KRpahkMXYJ51EIlA1x5"
	TestTradeNO     = "049dfbf0b96ae9e2fa54a4b8eed6ea34"
)
