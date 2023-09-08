package helper

import (
	"context"
	"fmt"
	"os"

	"github.com/labring/sealos/service/pay/conf"
	"go.mongodb.org/mongo-driver/bson"
)

type PMDetail struct {
	PayMethod     string   `bson:"payMethod"`
	Currency      string   `bson:"currency"`
	AmountOptions []string `bson:"amountOptions"`
	ExchangeRate  float64  `bson:"exchangeRate"`
	TaxRate       float64  `bson:"taxRate"`
}

func GetAppDetails(request *conf.Request) ([]PMDetail, error) {
	appID := request.AppID
	filter := bson.D{{"appID", appID}}
	appColl := InitDB(os.Getenv(conf.DBURI), conf.Database, conf.AppColl)

	var appResult bson.M
	if err := appColl.FindOne(context.TODO(), filter).Decode(&appResult); err != nil {
		//fmt.Println("read data of the collection app failed:", err)
		return nil, fmt.Errorf("read data of the collection app failed: %v", err)
	}
	methods, ok := appResult["methods"].(bson.A)
	if !ok {
		// 类型断言失败，处理错误
		//fmt.Println("methods type assertion failed")
		return nil, fmt.Errorf("methods type assertion failed")
	}
	var payDetails []PMDetail
	for _, method := range methods {
		pmColl := InitDB(os.Getenv(conf.DBURI), conf.Database, conf.PayMethodColl)
		filter := bson.D{{"payMethod", method}}

		// query operation
		cursor, err := pmColl.Find(context.TODO(), filter)
		if err != nil {
			//fmt.Println("query error:", err)
			return nil, fmt.Errorf("query error: %v", err)
		}
		// Iterate over the query results
		for cursor.Next(context.TODO()) {
			var document PMDetail
			if err := cursor.Decode(&document); err != nil {
				//fmt.Println("decode error:", err)
				return nil, fmt.Errorf("decode error: %v", err)
			}
			// Add matching documents to the payDetails slice
			payDetails = append(payDetails, document)
		}
		if err := cursor.Err(); err != nil {
			//fmt.Println("cursor error:", err)
			return nil, fmt.Errorf("cursor error: %v", err)
		}
	}
	return payDetails, nil
}
