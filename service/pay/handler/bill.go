package handler

import (
	"context"

	"github.com/labring/sealos/service/pay/helper"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type BillDetail struct {
	OrderID   string `bson:"orderID"`
	Amount    string `bson:"amount"`
	Currency  string `bson:"currency"`
	PayTime   string `bson:"payTime"`
	PayMethod string `bson:"payMethod"`
	Status    string `bson:"status"`
}

func GetBillDetails(request *helper.Request, client *mongo.Client) ([]BillDetail, error) {
	coll := helper.InitDBAndColl(client, helper.Database, helper.PaymentDetailsColl)
	filter := bson.D{
		{"user", request.User},
		{"appID", request.AppID},
	}

	cursor, err := coll.Find(context.Background(), filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	// init result array
	var billDetails []BillDetail

	if err := cursor.All(context.Background(), &billDetails); err != nil {
		return nil, err
	}

	return billDetails, nil
}
