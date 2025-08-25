package handler

import (
	"context"

	"github.com/labring/sealos/service/pay/helper"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

func GetBillDetails(request *helper.Request, client *mongo.Client) ([]helper.BillDetail, error) {
	coll := helper.InitDBAndColl(client, helper.Database, helper.PaymentDetailsColl)
	filter := bson.D{
		{Key: "user", Value: request.User},
		{Key: "appID", Value: request.AppID},
	}

	cursor, err := coll.Find(context.Background(), filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	// init result array
	var billDetails []helper.BillDetail

	if err := cursor.All(context.Background(), &billDetails); err != nil {
		return nil, err
	}

	return billDetails, nil
}
