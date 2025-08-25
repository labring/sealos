package handler

import (
	"context"
	"fmt"

	"github.com/labring/sealos/service/pay/helper"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

func GetExchangeRate(client *mongo.Client, payMethod, currency string) (float64, error) {
	coll := helper.InitDBAndColl(client, helper.Database, helper.PayMethodColl)
	filter := bson.D{
		{Key: "payMethod", Value: payMethod},
		{Key: "currency", Value: currency},
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

func InsertPayMethod(request *helper.Request, client *mongo.Client) (*mongo.InsertManyResult, error) {
	payMethod := request.PayMethod
	currency := request.Currency
	amountOptions := request.AmountOptions
	exchangerate := request.ExchangeRate
	taxRate := request.TaxRate

	coll := helper.InitDBAndColl(client, helper.Database, helper.PayMethodColl)

	docs := []interface{}{
		helper.PayMethodDetail{
			PayMethod:     payMethod,
			Currency:      currency,
			AmountOptions: amountOptions,
			ExchangeRate:  exchangerate,
			TaxRate:       taxRate,
		},
	}

	result, err := coll.InsertMany(context.TODO(), docs)
	if err != nil {
		return nil, fmt.Errorf("insert the data of paymethod failed: %v", err)
	}
	return result, nil
}

func CheckPayMethodExistOrNot(client *mongo.Client, currency, payMethod string) (bool, error) {
	coll := helper.InitDBAndColl(client, helper.Database, helper.PayMethodColl)
	filter := bson.D{
		{Key: "payMethod", Value: payMethod},
		{Key: "currency", Value: currency},
	}

	var result bson.M
	if err := coll.FindOne(context.Background(), filter).Decode(&result); err != nil {
		fmt.Println("no matching payment method and currency could be found:", err)
		return false, fmt.Errorf("no matching payment method and currency could be found: %v", err)
	}
	return true, nil
}
