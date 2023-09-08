package helper

import (
	"context"
	"fmt"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/pay/conf"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

func GetPaymentStatus(orderID string) (string, error) {
	coll := InitDB(os.Getenv(conf.DBURI), conf.Database, conf.PaymentDetailsColl)
	filter := bson.D{{"orderID", orderID}}
	var paymentResult bson.M
	if err := coll.FindOne(context.TODO(), filter).Decode(&paymentResult); err != nil {
		fmt.Println("read data of the collection paymentDetails failed:", err)
		return "", fmt.Errorf("read data of the collection paymentDetails failed: %v", err)
	}
	status, ok := paymentResult["status"].(string)
	if !ok {
		// 类型断言失败，处理错误
		fmt.Println("status type assertion failed")
		return "", fmt.Errorf("status type assertion failed")
	}
	return status, nil
}

func UpdatePaymentStatus(orderID string, status string) (string, error) {
	coll := InitDB(os.Getenv(conf.DBURI), conf.Database, conf.PaymentDetailsColl)
	filter := bson.D{{"orderID", orderID}}
	update := bson.D{
		{"$set", bson.D{
			{"status", status},
		}},
	}
	var paymentResult bson.M
	if err := coll.FindOneAndUpdate(context.Background(), filter, update).Decode(&paymentResult); err != nil {
		fmt.Println("update payment status failed:", err)
		return "", fmt.Errorf("update payment status failed: %v", err)
	}
	//这里的paymentResult是更新前的数据
	return paymentResult["status"].(string), nil
}

func UpdateDBIfDiff(c *gin.Context, orderID, status, aimStatus string) {
	// 如果数据库订单状态也为aimStatus，直接返回
	if status == aimStatus {
		c.AbortWithStatusJSON(http.StatusOK, gin.H{
			"message": "payment status is: " + aimStatus + ",please try again later",
			"status":  status,
			"orderID": orderID,
		})
		return
	}
	paymentStatus, err := UpdatePaymentStatus(orderID, aimStatus)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("update payment status failed when wechat order status is %s: %s, %v", aimStatus, paymentStatus, err),
		})
		return
	}
	c.AbortWithStatusJSON(http.StatusOK, gin.H{
		"message": "payment is " + aimStatus + ", database has been updated",
		"status":  aimStatus,
		"orderID": orderID,
	})
}

func CheckOrderExistOrNot(request *conf.Request) error {
	orderID := request.OrderID
	payMethod := request.PayMethod
	appID := request.AppID
	coll := InitDB(os.Getenv(conf.DBURI), conf.Database, conf.OrderDetailsColl)
	filter := bson.D{
		{"orderID", orderID},
		{"payMethod", payMethod},
		{"appID", appID},
	}
	// Execute the MongoDB query
	var result OrderDetails
	err := coll.FindOne(context.Background(), filter).Decode(&result)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return fmt.Errorf("order not found")
		}
		return fmt.Errorf("failed to query order details: %w", err)
	}

	// Perform additional checks based on the payMethod
	switch payMethod {
	case "stripe":
		if result.DetailsData["sessionID"] != request.SessionID {
			return fmt.Errorf("sessionID mismatch")
		}
	case "wechat":
		if result.DetailsData["tradeNO"] != request.TradeNO {
			return fmt.Errorf("TradeNO mismatch")
		}
	default:
		return fmt.Errorf("unsupported payMethod: %s", payMethod)
	}

	// Order and payMethod are valid
	return nil
}
