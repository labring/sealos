package handler

import (
	"context"
	"fmt"

	"github.com/labring/sealos/service/pay/helper"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

func InsertApp(client *mongo.Client, appID int64, sign, appName string, methods []string) (*mongo.InsertManyResult, error) {
	coll := helper.InitDBAndColl(client, helper.Database, helper.AppColl)
	docs := []interface{}{
		helper.App{
			AppID:      appID,
			Sign:       sign,
			PayAppName: appName,
			Methods:    methods,
		},
	}

	result, err := coll.InsertMany(context.TODO(), docs)
	if err != nil {
		//fmt.Println("insert the data of app failed:", err)
		return nil, fmt.Errorf("insert the data of app failed: %v", err)
	}
	fmt.Println("insert the data of app success:", result)
	return result, nil
}

// CheckAppAllowOrNot checks if the appID is allowed to use the payMethod
func CheckAppAllowOrNot(client *mongo.Client, appID int64, payMethod string) error {
	coll := helper.InitDBAndColl(client, helper.Database, helper.AppColl)
	filter := bson.D{{Key: "appID", Value: appID}}
	var result bson.M
	if err := coll.FindOne(context.Background(), filter).Decode(&result); err != nil {
		fmt.Println("no allowed appID could be found:", err)
		return fmt.Errorf("no allowed appID could be found: %v", err)
	}

	methods := result["methods"].(bson.A)
	for _, method := range methods {
		if method == payMethod {
			return nil
		}
	}
	return fmt.Errorf("this payment method is not allowed in this app")
}

func CheckAppNameExistOrNot(client *mongo.Client, appName string) error {
	coll := helper.InitDBAndColl(client, helper.Database, helper.AppColl)
	filter := bson.D{{Key: "payAppName", Value: appName}}

	var result bson.M
	err := coll.FindOne(context.Background(), filter).Decode(&result)
	if err == mongo.ErrNoDocuments {
		// appName does not exist, return nil
		return nil
	} else if err != nil {
		// query error
		return fmt.Errorf("query error: %v", err)
	}

	// payAppName already exist
	return fmt.Errorf("app name already exists")
}
