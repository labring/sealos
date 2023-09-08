package helper

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/labring/sealos/pkg/pay"
	"github.com/labring/sealos/service/pay/conf"
	gonanoid "github.com/matoous/go-nanoid/v2"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

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
	Amount      string                 `bson:"amount"`
	PayTime     string                 `bson:"paytime"`
	PayMethod   string                 `bson:"payMethod"`
	AppID       int64                  `bson:"appID"`
	DetailsData map[string]interface{} `bson:"detailsdata"`
}

// InsertDetails inserts data into both the payment_details and order_details tables and ensures transactionality
func InsertDetails(user, payMethod, amount, currency string, appID int64, details map[string]interface{}) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(os.Getenv(conf.DBURI)))
	defer func() {
		if err = client.Disconnect(ctx); err != nil {
			panic(err)
		}
	}()
	if err = client.Ping(context.TODO(), readpref.Primary()); err != nil {
		return "", fmt.Errorf("connect to mongodb failed: %w", err)
	}

	// create transaction options
	maxCommitTime := 5 * time.Second
	transactionOptions := options.Transaction().SetMaxCommitTime(&maxCommitTime)

	// execute transaction
	session, err := client.StartSession()
	if err != nil {
		fmt.Println("failed to create a session:", err)
	}
	defer session.EndSession(context.Background())

	// execute transaction
	result, err := session.WithTransaction(context.Background(), func(sessCtx mongo.SessionContext) (interface{}, error) {
		// perform an operation to insert data into paymentDetails in a transaction
		orderID, err := InsertPaymentDetails(user, payMethod, amount, currency, appID)
		if err != nil {
			fmt.Println("insert payment details failed:", err)
			return nil, fmt.Errorf("insert payment details failed: %v", err)
		}

		// the insertion of data to the orderDetailsColl in a transaction
		if err := InsertOrderDetails(appID, orderID, amount, payMethod, currency, details); err != nil {
			fmt.Println("insert order details failed:", err)
			return nil, fmt.Errorf("insert order details failed: %v", err)
		}

		return orderID, nil
	}, transactionOptions)

	if err != nil {
		fmt.Println("transaction execution failure:", err)
	}

	orderID := result.(string)
	fmt.Println("Order ID:", orderID)
	return orderID, nil
}

func InsertPaymentDetails(user, payMethod, amount, currency string, appID int64) (string, error) {
	coll := InitDB(os.Getenv(conf.DBURI), conf.Database, conf.PaymentDetailsColl)
	orderID, err := gonanoid.New(18)
	// switched to the Chinese time zone and optimized the format
	payTime := time.Now().UTC().In(time.FixedZone("CST", 8*60*60)).Format("2006-01-02 15:04:05")
	if err != nil {
		return "", fmt.Errorf("create order id failed: %w", err)
	}
	docs := []interface{}{
		PaymentDetails{
			OrderID:   orderID,
			User:      user,
			Amount:    amount,
			Currency:  currency,
			PayTime:   payTime,
			PayMethod: payMethod,
			AppID:     appID,
			Status:    pay.PaymentNotPaid,
		},
	}

	result, err := coll.InsertMany(context.TODO(), docs)
	if err != nil {
		return "", fmt.Errorf("insert the data of payment details failed: %w", err)
	}
	fmt.Println("insert the data of payment details successfully:", result)
	return orderID, nil
}

func InsertOrderDetails(appID int64, orderID, amount, payMethod, currency string, details map[string]interface{}) error {
	coll := InitDB(os.Getenv(conf.DBURI), conf.Database, conf.OrderDetailsColl)
	// switched to the Chinese time zone and optimized the format
	payTime := time.Now().UTC().In(time.FixedZone("CST", 8*60*60)).Format("2006-01-02 15:04:05")
	// get the exchange rate corresponding to the currency,
	// and then calculate the corresponding RMB amount / sealos amount
	exchangeRate, err := GetExchangeRate(payMethod, currency)
	if err != nil {
		return fmt.Errorf("get exchange rate failed: %w", err)
	}
	// convert amount to type float64
	amountFloat, err := strconv.ParseFloat(amount, 64)
	if err != nil {
		return fmt.Errorf("the amount cannot be converted to float64: %w", err)
	}
	// calculate the product of the amountFloat and the exchangeRate
	newAmount := amountFloat * exchangeRate
	newAmountStr := strconv.FormatFloat(newAmount, 'f', 2, 64)

	docs := []interface{}{
		OrderDetails{
			OrderID:     orderID,
			Amount:      newAmountStr,
			PayTime:     payTime,
			PayMethod:   payMethod,
			AppID:       appID,
			DetailsData: details,
		},
	}
	result, err := coll.InsertMany(context.TODO(), docs)
	if err != nil {
		return fmt.Errorf("insert the data of order details failed: %w", err)
	}
	fmt.Println("insert the data of order details successfully:", result)
	return nil
}
