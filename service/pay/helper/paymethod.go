package helper

import (
	"context"
	"fmt"
	"os"

	"github.com/labring/sealos/service/pay/conf"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

func GetExchangeRate(payMethod, currency string) (float64, error) {
	coll := InitDB(os.Getenv(conf.DBURI), conf.Database, conf.PayMethodColl)
	filter := bson.D{
		{"payMethod", payMethod},
		{"currency", currency},
	}

	var result bson.M
	if err := coll.FindOne(context.Background(), filter).Decode(&result); err != nil {
		fmt.Println("read data of the collection paymethod failed:", err)
		return 0, fmt.Errorf("read data of the collection paymethod failed: %v", err)
	}
	exchangeRate, ok := result["exchangeRate"].(float64)
	if !ok {
		fmt.Println("status type assertion failed")
		return 0, fmt.Errorf("status type assertion failed")
	}
	return exchangeRate, nil
}

func InsertPayMethod(request *conf.Request) (*mongo.InsertManyResult, error) {
	payMethod := request.PayMethod
	currency := request.Currency
	amountOptions := request.AmountOptions
	exchangerate := request.ExchangeRate
	taxRate := request.TaxRate

	coll := InitDB(os.Getenv(conf.DBURI), conf.Database, conf.PayMethodColl)

	docs := []interface{}{
		PMDetail{
			PayMethod:     payMethod,
			Currency:      currency,
			AmountOptions: amountOptions,
			ExchangeRate:  exchangerate,
			TaxRate:       taxRate,
		},
	}

	result, err := coll.InsertMany(context.TODO(), docs)
	if err != nil {
		//fmt.Println("insert the data of paymethod failed:", err)
		return nil, fmt.Errorf("insert the data of paymethod failed: %v", err)
	}
	return result, nil
}

func CheckPayMethodExistOrNot(currency, payMethod string) (bool, error) {
	coll := InitDB(os.Getenv(conf.DBURI), conf.Database, conf.PayMethodColl)
	filter := bson.D{
		{"payMethod", payMethod},
		{"currency", currency},
	}

	var result bson.M
	if err := coll.FindOne(context.Background(), filter).Decode(&result); err != nil {
		fmt.Println("no matching payment method and currency could be found:", err)
		return false, fmt.Errorf("no matching payment method and currency could be found: %v", err)
	}
	return true, nil
}
