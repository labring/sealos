package helper

import (
	"fmt"
	"strings"
	"time"

	"github.com/labring/sealos/service/account/common"

	"github.com/dustin/go-humanize"

	"github.com/gin-gonic/gin"
)

type NamespaceBillingHistoryReq struct {
	// @Summary Start and end time for the request
	// @Description Start and end time for the request
	// @JSONSchema required
	TimeRange `json:",inline" bson:",inline"`

	// @Summary Authentication information
	// @Description Authentication information
	// @JSONSchema required
	Auth `json:",inline" bson:",inline"`

	// @Summary Type of the request (optional)
	// @Description Type of the request (optional)
	// @JSONSchema
	Type int `json:"type" bson:"type"`
}

type SetPaymentInvoiceReq struct {
	// @Summary Payment ID list
	// @Description Payment ID list
	// @JSONSchema required
	PaymentIDList []string `json:"paymentIDList" bson:"paymentIDList" binding:"required" example:"[\"payment-id-1\",\"payment-id-2\"]"`

	// @Summary Authentication information
	// @Description Authentication information
	// @JSONSchema required
	Auth `json:",inline" bson:",inline"`
}

type TransferAmountReq struct {
	// @Summary Transfer amount
	// @Description Transfer amount
	// @JSONSchema required
	Amount int64 `json:"amount" bson:"amount" example:"100000000"`

	// @Summary To user
	// @Description To user
	// @JSONSchema required
	ToUser string `json:"toUser" bson:"toUser" binding:"required" example:"admin"`

	// @Summary Authentication information
	// @Description Authentication information
	// @JSONSchema required
	Auth `json:",inline" bson:",inline"`

	// @Summary Transfer all
	// @Description Transfer all amount
	TransferAll bool `json:"transferAll" bson:"transferAll"`
}

type ConsumptionRecordReq struct {

	// @Summary Start and end time for the request
	// @Description Start and end time for the request
	// @JSONSchema required
	TimeRange `json:",inline" bson:",inline"`

	// @Summary Namespace
	// @Description Namespace
	Namespace string `json:"namespace,omitempty" bson:"namespace" example:"ns-admin"`

	// @Summary Authentication information
	// @Description Authentication information
	// @JSONSchema required
	Auth `json:",inline" bson:",inline"`

	// @Summary App type
	// @Description App type
	AppType string `json:"appType,omitempty" bson:"appType" example:"app"`
}

type NamespaceBillingHistoryResp struct {
	Data    NamespaceBillingHistoryRespData `json:"data,omitempty" bson:"data,omitempty"`
	Message string                          `json:"message,omitempty" bson:"message" example:"successfully retrieved namespace list"`
}

type NamespaceBillingHistoryRespData struct {
	List []string `json:"list,omitempty" bson:"list,omitempty" example:"[\"ns-admin\",\"ns-test1\"]"`
}

type GetPropertiesResp struct {
	Data    GetPropertiesRespData `json:"data,omitempty" bson:"data,omitempty"`
	Message string                `json:"message,omitempty" bson:"message" example:"successfully retrieved properties"`
}

type GetPropertiesRespData struct {
	Properties []common.PropertyQuery `json:"properties,omitempty" bson:"properties,omitempty"`
}

type ErrorMessage struct {
	Error string `json:"error,omitempty" bson:"error,omitempty" example:"authentication failure"`
}

type TimeRange struct {
	StartTime time.Time `json:"startTime" bson:"startTime" example:"2021-01-01T00:00:00Z"`
	EndTime   time.Time `json:"endTime" bson:"endTime" example:"2021-12-01T00:00:00Z"`
}

type Auth struct {
	Owner      string `json:"owner" bson:"owner" binding:"required" example:"admin"`
	UserID     string `json:"userID" bson:"userID" example:"admin"`
	KubeConfig string `json:"kubeConfig" bson:"kubeConfig" binding:"required"`
}

func ParseNamespaceBillingHistoryReq(c *gin.Context) (*NamespaceBillingHistoryReq, error) {
	nsList := &NamespaceBillingHistoryReq{}
	err := c.ShouldBindJSON(nsList)
	if err != nil {
		return nil, fmt.Errorf("bind json error : %v", err)
	}
	return nsList, nil
}

func ParseSetPaymentInvoiceReq(c *gin.Context) (*SetPaymentInvoiceReq, error) {
	paymentList := &SetPaymentInvoiceReq{}
	err := c.ShouldBindJSON(paymentList)
	if err != nil {
		return nil, fmt.Errorf("bind json error : %v", err)
	}
	return paymentList, nil
}

func ParseTransferAmountReq(c *gin.Context) (*TransferAmountReq, error) {
	transferAmount := &TransferAmountReq{}
	if err := c.ShouldBindJSON(transferAmount); err != nil {
		return nil, fmt.Errorf("bind json error: %v", err)
	}
	if transferAmount.Amount == 0 && !transferAmount.TransferAll {
		return nil, fmt.Errorf("transfer amount cannot be empty")
	}
	return transferAmount, nil
}

func ParseConsumptionRecordReq(c *gin.Context) (*ConsumptionRecordReq, error) {
	consumptionRecord := &ConsumptionRecordReq{}
	if err := c.ShouldBindJSON(consumptionRecord); err != nil {
		return nil, fmt.Errorf("bind json error: %v", err)
	}
	if consumptionRecord.TimeRange.StartTime.Before(time.Now().Add(-6 * humanize.Month)) {
		consumptionRecord.TimeRange.StartTime = time.Now().Add(-6 * humanize.Month)
	}
	if consumptionRecord.TimeRange.EndTime.After(time.Now()) {
		consumptionRecord.TimeRange.EndTime = time.Now()
	}
	return consumptionRecord, nil
}

type UserBaseReq struct {

	// @Summary Start and end time for the request
	// @Description Start and end time for the request
	// @JSONSchema required
	TimeRange `json:",inline" bson:",inline"`

	// @Summary Authentication information
	// @Description Authentication information
	// @JSONSchema required
	Auth `json:",inline" bson:",inline"`
}

func ParseUserBaseReq(c *gin.Context) (*UserBaseReq, error) {
	userCosts := &UserBaseReq{}
	if err := c.ShouldBindJSON(userCosts); err != nil {
		return nil, fmt.Errorf("bind json error: %v", err)
	}
	if userCosts.TimeRange.StartTime.Before(time.Now().Add(-6 * humanize.Month)) {
		userCosts.TimeRange.StartTime = time.Now().Add(-6 * humanize.Month)
	}
	if userCosts.TimeRange.EndTime.After(time.Now()) {
		userCosts.TimeRange.EndTime = time.Now()
	}
	userCosts.Owner = strings.TrimPrefix(userCosts.Owner, "ns-")
	return userCosts, nil
}

type AppCostsReq struct {
	UserBaseReq `json:",inline" bson:",inline"`

	// @Summary Namespace
	// @Description Namespace
	Namespace string `json:"namespace,omitempty" bson:"namespace" example:"ns-admin"`
	// @Summary App type
	// @Description App type
	AppType string `json:"appType,omitempty" bson:"appType" example:"app"`

	// @Summary App Name
	// @Description App Name
	AppName string `json:"appName,omitempty" bson:"appName" example:"app"`

	// @Summary Page
	// @Description Page
	Page int `json:"page,omitempty" bson:"page" example:"1"`

	// @Summary Page Size
	// @Description Page Size
	PageSize int `json:"pageSize,omitempty" bson:"pageSize" example:"10"`
}

func ParseAppCostsReq(c *gin.Context) (*AppCostsReq, error) {
	userCosts := &AppCostsReq{}
	if err := c.ShouldBindJSON(userCosts); err != nil {
		return nil, fmt.Errorf("bind json error: %v", err)
	}
	if userCosts.TimeRange.StartTime.Before(time.Now().Add(-6 * humanize.Month)) {
		userCosts.TimeRange.StartTime = time.Now().Add(-6 * humanize.Month)
	}
	if userCosts.TimeRange.EndTime.After(time.Now()) {
		userCosts.TimeRange.EndTime = time.Now()
	}
	userCosts.Owner = strings.TrimPrefix(userCosts.Owner, "ns-")
	return userCosts, nil
}

type GetTransferRecordReq struct {
	UserBaseReq `json:",inline" bson:",inline"`

	// 0: all, 1: in, 2: out
	// @Summary Type of the request
	// @Description Type of the request: 0: all, 1: transfer in, 2: transfer out
	Type int `json:"type,omitempty" bson:"type" example:"0"`

	// @Summary Transfer ID
	// @Description Transfer ID
	TransferID string `json:"transferID,omitempty" bson:"transferID" example:"transfer-id-1"`

	// @Summary Page
	// @Description Page
	Page int `json:"page,omitempty" bson:"page" example:"1"`

	// @Summary Page Size
	// @Description Page Size
	PageSize int `json:"pageSize,omitempty" bson:"pageSize" example:"10"`
}

func ParseGetTransferRecordReq(c *gin.Context) (*GetTransferRecordReq, error) {
	transferReq := &GetTransferRecordReq{}
	if err := c.ShouldBindJSON(transferReq); err != nil {
		return nil, fmt.Errorf("bind json error: %v", err)
	}
	if transferReq.TimeRange.StartTime.Before(time.Now().Add(-6 * humanize.Month)) {
		transferReq.TimeRange.StartTime = time.Now().Add(-6 * humanize.Month)
	}
	if transferReq.TimeRange.EndTime.After(time.Now()) {
		transferReq.TimeRange.EndTime = time.Now()
	}
	transferReq.Owner = strings.TrimPrefix(transferReq.Owner, "ns-")
	return transferReq, nil
}
