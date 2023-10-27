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
