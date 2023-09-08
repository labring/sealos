package helper

import (
	"context"
	"os"

	"github.com/labring/sealos/service/pay/conf"
	"go.mongodb.org/mongo-driver/bson"
)

type BillDetail struct {
	OrderID   string `bson:"orderID"`
	Amount    string `bson:"amount"`
	Currency  string `bson:"currency"`
	PayTime   string `bson:"payTime"`
	PayMethod string `bson:"payMethod"`
	Status    string `bson:"status"`
}

func GetBillDetails(request *conf.Request) ([]BillDetail, error) {
	coll := InitDB(os.Getenv(conf.DBURI), conf.Database, conf.PaymentDetailsColl)
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

	for cursor.Next(context.Background()) {
		var result BillDetail
		if err := cursor.Decode(&result); err != nil {
			return nil, err
		}
		billDetails = append(billDetails, result)
	}
	return billDetails, nil
}
