package handler

import (
	"context"
	"fmt"

	"github.com/labring/sealos/service/pay/helper"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type PMDetail struct {
	PayMethod     string   `bson:"payMethod"`
	Currency      string   `bson:"currency"`
	AmountOptions []string `bson:"amountOptions"`
	ExchangeRate  float64  `bson:"exchangeRate"`
	TaxRate       float64  `bson:"taxRate"`
}

func GetAppDetails(request *helper.Request, client *mongo.Client) ([]PMDetail, error) {
	appID := request.AppID
	filter := bson.D{{Key: "appID", Value: appID}}
	appColl := helper.InitDBAndColl(client, helper.Database, helper.AppColl)

	var appResult bson.M
	if err := appColl.FindOne(context.TODO(), filter).Decode(&appResult); err != nil {
		return nil, fmt.Errorf("read data of the collection app failed: %v", err)
	}
	methods, ok := appResult["methods"].(bson.A)
	if !ok {
		return nil, fmt.Errorf("methods type assertion failed")
	}
	var payDetails []PMDetail
	for _, method := range methods {
		pmColl := helper.InitDBAndColl(client, helper.Database, helper.PayMethodColl)
		filter := bson.D{{Key: "payMethod", Value: method}}

		// query operation
		cursor, err := pmColl.Find(context.TODO(), filter)
		if err != nil {
			return nil, fmt.Errorf("query error: %v", err)
		}
		// Retrieve documents for the current payment method
		var methodPayDetails []PMDetail
		if err := cursor.All(context.TODO(), &methodPayDetails); err != nil {
			return nil, fmt.Errorf("cursor error: %v", err)
		}

		// Add the matching method of the documents to the payDetails slice
		payDetails = append(payDetails, methodPayDetails...)
	}
	return payDetails, nil
}
