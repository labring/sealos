package conf

type Request struct {
	AppID         int64    `json:"appID"`
	Sign          string   `json:"sign"`
	PayMethod     string   `json:"payMethod"`
	Amount        string   `json:"amount"`
	User          string   `json:"user"`
	PayAppName    string   `json:"payAppName，omitempty"`
	Currency      string   `json:"currency，omitempty"`
	AmountOptions []string `json:"amountOptions，omitempty"`
	ExchangeRate  float64  `json:"exchangeRate，omitempty"`
	TaxRate       float64  `json:"taxRate，omitempty"`
	TradeNO       string   `json:"tradeNO，omitempty"`
	SessionID     string   `json:"sessionID，omitempty"`
	OrderID       string   `json:"orderID，omitempty"`
}

// DB
const (
	DBURI              = "dburi"
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

// Test
const (
	LOCALHOST       = "http://localhost:8080"
	DNS             = "https://coqveoktbleo.dev.sealos.top"
	GROUP           = "/v1alpha1/pay"
	CreatePayMethod = "/method"
	CreatePayApp    = "/app"
	GetAppDetails   = "/details"
	GetSession      = "/session"
	GetPayStatus    = "/status"
	GetBill         = "/bill"
)
