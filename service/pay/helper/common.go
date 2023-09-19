package helper

type Request struct {
	AppID         int64    `json:"appID"`
	Sign          string   `json:"sign"`
	PayMethod     string   `json:"payMethod"`
	Amount        string   `json:"amount"`
	User          string   `json:"user"`
	PayAppName    string   `json:"payAppName,omitempty"`
	Currency      string   `json:"currency,omitempty"`
	AmountOptions []string `json:"amountOptions,omitempty"`
	ExchangeRate  float64  `json:"exchangeRate,omitempty"`
	TaxRate       float64  `json:"taxRate,omitempty"`
	TradeNO       string   `json:"tradeNO,omitempty"`
	SessionID     string   `json:"sessionID,omitempty"`
	OrderID       string   `json:"orderID,omitempty"`
}

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
	TestUser        = "cx"
	TestOrderID     = "VS4gw76Ej-wIzGa1p2"
	TestSessionID   = "cs_test_a1GdmdhVBHivyUqtLdl9ILv1fXneuPIY5XdtlTpljHYInH1fPhGCN8KmWt"
	TestTradeNO     = "db27af04c65bd27bb3c3708addbafc01"
)
