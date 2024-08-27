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
	*Auth `json:",inline" bson:",inline"`

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
	*Auth `json:",inline" bson:",inline"`
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
	*Auth `json:",inline" bson:",inline"`

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
	*Auth `json:",inline" bson:",inline"`

	// @Summary App type
	// @Description App type
	AppType string `json:"appType,omitempty" bson:"appType" example:"app"`

	// @Summary App Name
	// @Description App Name
	AppName string `json:"appName,omitempty" bson:"appName" example:"app"`
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
	Owner      string `json:"owner" bson:"owner" example:"admin"`
	UserID     string `json:"userID" bson:"userID" example:"admin"`
	KubeConfig string `json:"kubeConfig" bson:"kubeConfig"`
	Token      string `json:"token" bson:"token" example:"token"`
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
	setDefaultTimeRange(&consumptionRecord.TimeRange)
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
	*Auth `json:",inline" bson:",inline"`
}

func ParseUserBaseReq(c *gin.Context) (*UserBaseReq, error) {
	userCosts := &UserBaseReq{}
	if err := c.ShouldBindJSON(userCosts); err != nil {
		return nil, fmt.Errorf("bind json error: %v", err)
	}
	setDefaultTimeRange(&userCosts.TimeRange)
	userCosts.Owner = strings.TrimPrefix(userCosts.Owner, "ns-")
	return userCosts, nil
}

func ParsePaymentReq(c *gin.Context) (*GetPaymentReq, error) {
	payment := &GetPaymentReq{}
	if err := c.ShouldBindJSON(payment); err != nil {
		return nil, fmt.Errorf("bind json error: %v", err)
	}
	if payment.Page <= 0 {
		payment.Page = 1
	}
	if payment.PageSize <= 0 {
		payment.PageSize = 10
	}
	return payment, nil
}

type AppCostsReq struct {
	// @Summary Order ID
	// @Description Order ID
	// @JSONSchema
	OrderID string `json:"orderID,omitempty" bson:"orderID" example:"order-id-1"`

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
	setDefaultTimeRange(&userCosts.TimeRange)
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
	setDefaultTimeRange(&transferReq.TimeRange)
	transferReq.Owner = strings.TrimPrefix(transferReq.Owner, "ns-")
	return transferReq, nil
}

func ParseGetCostAppListReq(c *gin.Context) (*GetCostAppListReq, error) {
	costAppList := &GetCostAppListReq{}
	if err := c.ShouldBindJSON(costAppList); err != nil {
		return nil, fmt.Errorf("bind json error: %v", err)
	}
	setDefaultTimeRange(&costAppList.TimeRange)
	return costAppList, nil
}

func setDefaultTimeRange(timeRange *TimeRange) {
	if timeRange.StartTime.IsZero() {
		timeRange.StartTime = time.Now().Add(-6 * humanize.Month)
	}
	if timeRange.EndTime.IsZero() {
		timeRange.EndTime = time.Now()
	}
}

type GetPaymentReq struct {
	// @Summary Payment ID
	// @Description Payment ID
	// @JSONSchema
	PaymentID string `json:"paymentID,omitempty" bson:"paymentID" example:"payment-id-1"`

	// @Summary Authentication information
	// @Description Authentication information
	// @JSONSchema required
	*Auth `json:",inline" bson:",inline"`

	// @Summary Limit request
	// @Description Limit request
	LimitReq `json:",inline" bson:",inline"`
}

type CostOverviewResp struct {
	// @Summary Cost overview
	// @Description Cost overview
	Overviews []CostOverview `json:"overviews" bson:"overviews"`

	// @Summary Limit response
	// @Description Limit response
	LimitResp `json:",inline" bson:",inline"`
}

type CostOverview struct {
	// @Summary Amount
	// @Description Amount
	Amount int64 `json:"amount" bson:"amount"`

	// @Summary Namespace
	// @Description Namespace
	Namespace string `json:"namespace" bson:"namespace"`

	// @Summary Region domain
	// @Description Region domain
	RegionDomain string `json:"regionDomain" bson:"regionDomain" example:"region-domain-1"`

	// @Summary App type
	// @Description App type
	AppType uint8  `json:"appType" bson:"appType"`
	AppName string `json:"appName" bson:"appName"`
}

type GetCostAppListReq struct {
	// @Summary Authentication information
	// @Description Authentication information
	*Auth `json:",inline" bson:",inline"`

	// @Summary Namespace
	// @Description Namespace
	Namespace string `json:"namespace" bson:"namespace"`

	// @Summary App type
	// @Description App type
	AppType string `json:"appType" bson:"appType"`

	// @Summary App Name
	// @Description App Name
	AppName string `json:"appName" bson:"appName"`

	// @Summary Limit request
	// @Description Limit request
	LimitReq `json:",inline" bson:",inline"`
}

type CostAppListResp struct {
	// @Summary Cost app list
	// @Description Cost app list
	Apps []CostApp `json:"apps" bson:"apps"`

	// @Summary Limit response
	// @Description Limit response
	LimitResp `json:",inline" bson:",inline"`
}

type CostApp struct {
	// @Summary Namespace
	// @Description Namespace
	Namespace string `json:"namespace" bson:"namespace"`

	// @Summary App type
	// @Description App type
	AppType uint8 `json:"appType" bson:"appType"`

	// @Summary App Name
	// @Description App Name
	AppName string `json:"appName" bson:"appName"`
}

type LimitReq struct {
	// @Summary Page
	// @Description Page
	Page int `json:"page" bson:"page"`

	// @Summary Page Size
	// @Description Page Size
	PageSize int `json:"pageSize" bson:"pageSize"`

	// @Summary Time range
	// @Description Time range
	TimeRange `json:",inline" bson:",inline"`
}

type LimitResp struct {
	// @Summary Total
	// @Description Total
	Total int64 `json:"total" bson:"total"`

	// @Summary Total page
	// @Description Total page
	TotalPage int64 `json:"totalPage" bson:"totalPage"`
}

type ApplyInvoiceReq struct {
	// @Summary Authentication information
	// @Description Authentication information
	// @JSONSchema required
	*Auth `json:",inline" bson:",inline"`

	// payment id list
	// @Summary Payment ID list
	// @Description Payment ID list
	// @JSONSchema required
	PaymentIDList []string `json:"paymentIDList" bson:"paymentIDList" binding:"required" example:"[\"payment-id-1\",\"payment-id-2\"]"`

	// invoice detail information json
	// @Summary Invoice detail information
	// @Description Invoice detail information
	// @JSONSchema required
	Detail string `json:"detail" bson:"detail" binding:"required" example:"{\"title\":\"title\",\"amount\":100,\"taxRate\":0.06,\"tax\":6,\"total\":106,\"invoiceType\":1,\"invoiceContent\":1,\"invoiceStatus\":1,\"invoiceTime\":\"2021-01-01T00:00:00Z\",\"invoiceNumber\":\"invoice-number-1\",\"invoiceCode\":\"invoice-code-1\",\"invoiceFile\":\"invoice-file-1\"}"`
}

func ParseApplyInvoiceReq(c *gin.Context) (*ApplyInvoiceReq, error) {
	applyInvoice := &ApplyInvoiceReq{}
	if err := c.ShouldBindJSON(applyInvoice); err != nil {
		return nil, fmt.Errorf("bind json error: %v", err)
	}
	return applyInvoice, nil
}

type GetInvoiceReq struct {
	// @Summary Invoice ID
	// @Description Invoice ID
	// @JSONSchema
	InvoiceID string `json:"invoiceID,omitempty" bson:"invoiceID" example:"invoice-id-1"`

	// @Summary Authentication information
	// @Description Authentication information
	// @JSONSchema required
	*Auth `json:",inline" bson:",inline"`

	// @Summary Limit request
	// @Description Limit request
	LimitReq `json:",inline" bson:",inline"`
}

type SetInvoiceStatusReq struct {
	// Invoice id list
	// @Summary Invoice ID list
	// @Description Invoice ID list
	// @JSONSchema required
	InvoiceIDList []string `json:"invoiceIDList" bson:"invoiceIDList" binding:"required" example:"[\"invoice-id-1\",\"invoice-id-2\"]"`

	// Invoice status
	// @Summary Invoice status
	// @Description Invoice status
	// @JSONSchema required
	Status string `json:"status" bson:"status" binding:"required" example:"COMPLETED,REJECTED,PENDING"`

	// @Summary Authentication token
	// @Description Authentication token
	// @JSONSchema required
	Token string `json:"token" bson:"token" binding:"required" example:"token"`
}

func ParseGetInvoiceReq(c *gin.Context) (*GetInvoiceReq, error) {
	invoiceList := &GetInvoiceReq{}
	if err := c.ShouldBindJSON(invoiceList); err != nil {
		return nil, fmt.Errorf("bind json error: %v", err)
	}
	return invoiceList, nil
}

func ParseSetInvoiceStatusReq(c *gin.Context) (*SetInvoiceStatusReq, error) {
	invoiceStatus := &SetInvoiceStatusReq{}
	if err := c.ShouldBindJSON(invoiceStatus); err != nil {
		return nil, fmt.Errorf("bind json error: %v", err)
	}
	return invoiceStatus, nil
}
