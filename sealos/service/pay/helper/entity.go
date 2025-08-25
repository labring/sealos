package helper

type PaymentDetails struct {
	OrderID   string `bson:"orderID"`
	User      string `bson:"user"`
	Amount    string `bson:"amount"`
	Currency  string `bson:"currency"`
	PayTime   string `bson:"payTime"`
	PayMethod string `bson:"payMethod"`
	AppID     int64  `bson:"appID"`
	Status    string `bson:"status"`
}

type OrderDetails struct {
	OrderID     string                 `bson:"orderID"`
	User        string                 `bson:"user"`
	Amount      string                 `bson:"amount"`
	PayTime     string                 `bson:"paytime"`
	PayMethod   string                 `bson:"payMethod"`
	AppID       int64                  `bson:"appID"`
	DetailsData map[string]interface{} `bson:"detailsdata"`
}

type App struct {
	AppID      int64    `bson:"appID"`
	Sign       string   `bson:"sign"`
	PayAppName string   `bson:"payAppName"`
	Methods    []string `bson:"methods"`
}

type BillDetail struct {
	OrderID   string `bson:"orderID"`
	Amount    string `bson:"amount"`
	Currency  string `bson:"currency"`
	PayTime   string `bson:"payTime"`
	PayMethod string `bson:"payMethod"`
	Status    string `bson:"status"`
}

type PayMethodDetail struct {
	PayMethod     string   `bson:"payMethod"`
	Currency      string   `bson:"currency"`
	AmountOptions []string `bson:"amountOptions"`
	ExchangeRate  float64  `bson:"exchangeRate"`
	TaxRate       float64  `bson:"taxRate"`
}
