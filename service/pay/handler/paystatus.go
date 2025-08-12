package handler

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/pay/helper"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

func GetPaymentStatus(client *mongo.Client, orderID string) (string, error) {
	coll := helper.InitDBAndColl(client, helper.Database, helper.PaymentDetailsColl)
	filter := bson.D{{Key: "orderID", Value: orderID}}
	var paymentResult bson.M
	if err := coll.FindOne(context.TODO(), filter).Decode(&paymentResult); err != nil {
		fmt.Println("read data of the collection paymentDetails failed:", err)
		return "", fmt.Errorf("read data of the collection paymentDetails failed: %w", err)
	}
	status, ok := paymentResult["status"].(string)
	if !ok {
		fmt.Println("status type assertion failed")
		return "", errors.New("status type assertion failed")
	}
	return status, nil
}

func UpdatePaymentStatus(client *mongo.Client, orderID, status string) (string, error) {
	coll := helper.InitDBAndColl(client, helper.Database, helper.PaymentDetailsColl)
	filter := bson.D{{Key: "orderID", Value: orderID}}
	update := bson.D{
		{Key: "$set", Value: bson.D{
			{Key: "status", Value: status},
		}},
	}
	var paymentResult bson.M
	if err := coll.FindOneAndUpdate(context.Background(), filter, update).Decode(&paymentResult); err != nil {
		fmt.Println("update payment status failed:", err)
		return "", fmt.Errorf("update payment status failed: %w", err)
	}
	// The payment Result here is the data before the update
	status, _ = paymentResult["status"].(string)
	return status, nil
}

func UpdateDBIfDiff(
	c *gin.Context,
	orderID string,
	client *mongo.Client,
	status, aimStatus string,
) {
	// If the database order Status is also aimed-Status, return directly
	if status == aimStatus {
		c.JSON(http.StatusOK, gin.H{
			"message": "payment status is: " + aimStatus + ",please try again later",
			"status":  status,
			"orderID": orderID,
		})
		return
	}
	paymentStatus, err := UpdatePaymentStatus(client, orderID, aimStatus)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf(
				"update payment status failed when wechat order status is %s: %s, %v",
				aimStatus,
				paymentStatus,
				err,
			),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "payment is " + aimStatus + ", database has been updated",
		"status":  aimStatus,
		"orderID": orderID,
	})
}

func CheckOrderExistOrNot(client *mongo.Client, request *helper.Request) error {
	orderID := request.OrderID
	payMethod := request.PayMethod
	appID := request.AppID
	user := request.User
	coll := helper.InitDBAndColl(client, helper.Database, helper.OrderDetailsColl)
	filter := bson.D{
		{Key: "orderID", Value: orderID},
		{Key: "payMethod", Value: payMethod},
		{Key: "user", Value: user},
		{Key: "appID", Value: appID},
	}
	// Execute the MongoDB query
	var result helper.OrderDetails
	err := coll.FindOne(context.Background(), filter).Decode(&result)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return errors.New("order not found")
		}
		return fmt.Errorf("failed to query order details: %w", err)
	}

	// Perform additional checks based on the payMethod
	switch payMethod {
	case "stripe":
		if result.DetailsData["sessionID"] != request.SessionID {
			return errors.New("sessionID mismatch")
		}
	case "wechat":
		if result.DetailsData["tradeNO"] != request.TradeNO {
			return errors.New("TradeNO mismatch")
		}
	default:
		return fmt.Errorf("unsupported payMethod: %s", payMethod)
	}

	// Order and payMethod are valid
	return nil
}
