package helper

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/dustin/go-humanize"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/common"
)

type AuthReq interface {
	GetAuth() *Auth
	SetAuth(auth *Auth)
}

type NamespaceBillingHistoryReq struct {
	// @Summary Start and end time for the request
	// @Description Start and end time for the request
	// @JSONSchema required
	TimeRange `json:",inline" bson:",inline"`

	// @Summary Authentication information
	// @Description Authentication information
	// @JSONSchema required
	AuthBase `json:",inline" bson:",inline"`

	// @Summary Type of the request (optional)
	// @Description Type of the request (optional)
	// @JSONSchema
	Type int `json:"type" bson:"type"`
}

type SetPaymentInvoiceReq struct {
	// @Summary Payment ID list
	// @Description Payment ID list
	// @JSONSchema required
	PaymentIDList []string `json:"paymentIDList" bson:"paymentIDList" binding:"required" example:"[payment-id-1, payment-id-2]"`

	// @Summary Authentication information
	// @Description Authentication information
	// @JSONSchema required
	AuthBase `json:",inline" bson:",inline"`
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
	AuthBase `json:",inline" bson:",inline"`

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
	AuthBase `json:",inline" bson:",inline"`

	// @Summary App type
	// @Description App type
	AppType string `json:"appType,omitempty" bson:"appType" example:"app"`

	// @Summary App Name
	// @Description App Name
	AppName string `json:"appName,omitempty" bson:"appName" example:"app"`
}

type UserTimeRangeReq struct {
	// @Summary Start and end time for the request
	// @Description Start and end time for the request
	// @JSONSchema required
	TimeRange `json:",inline" bson:",inline"`

	// @Summary Authentication information
	// @Description Authentication information
	// @JSONSchema required
	AuthBase `json:",inline" bson:",inline"`
}

// ResourceUsage 定义资源使用情况的结构体
type ResourceUsage struct {
	Used       map[uint8]int64 `json:"used"`        // 资源使用量，key为资源类型
	UsedAmount map[uint8]int64 `json:"used_amount"` // 资源使用花费，key为资源类型
	Count      int             `json:"count"`       // 记录数量
}

// AppResourceCostsResponse 定义返回结果的结构体
type AppResourceCostsResponse struct {
	ResourcesByType map[string]*ResourceUsage `json:"resources_by_type,omitempty"`
	AppType         string                    `json:"app_type"`
}

type AppCostDetail struct {
	AppType    uint8           `json:"app_type,omitempty"    bson:"app_type,omitempty"`
	AppName    string          `json:"app_name,omitempty"    bson:"app_name,omitempty"`
	Amount     int64           `json:"amount,omitempty"      bson:"amount,omitempty"`
	Used       map[uint8]int64 `json:"used,omitempty"        bson:"used,omitempty"`
	UsedAmount map[uint8]int64 `json:"used_amount,omitempty" bson:"used_amount,omitempty"`
}

// WorkspaceAppCostWithResources 包含成本数据和资源使用情况的组合结构体
type WorkspaceAppCostWithResources struct {
	AppName         string          `json:"app_name,omitempty"          bson:"app_name,omitempty"  example:"app"`
	AppType         int32           `json:"app_type,omitempty"          bson:"app_type,omitempty"  example:"8"`
	Time            time.Time       `json:"time,omitempty"              bson:"time,omitempty"      example:"2021-01-01T00:00:00Z"`
	OrderID         string          `json:"order_id,omitempty"          bson:"order_id,omitempty"  example:"order_id"`
	Namespace       string          `json:"namespace,omitempty"         bson:"namespace,omitempty" example:"ns-admin"`
	Amount          int64           `json:"amount,omitempty"            bson:"amount,omitempty"    example:"100000000"`
	ResourcesByType []AppCostDetail `json:"resources_by_type,omitempty"`
}

// WorkspaceAppCostsResponse 工作空间应用成本和资源使用的响应结构体
type WorkspaceAppCostsResponse struct {
	Costs        []WorkspaceAppCostWithResources `json:"costs,omitempty"         bson:"costs,omitempty"`
	CurrentPage  int                             `json:"current_page,omitempty"  bson:"current_page,omitempty"  example:"1"`
	TotalPages   int                             `json:"total_pages,omitempty"   bson:"total_pages,omitempty"   example:"1"`
	TotalRecords int                             `json:"total_records,omitempty" bson:"total_records,omitempty" example:"1"`
}

type AppCostsReq struct {
	// @Summary Order ID
	// @Description Order ID
	// @JSONSchema
	OrderID string `json:"orderID,omitempty" bson:"orderID" example:"order-id-1"`

	UserTimeRangeReq `json:",inline" bson:",inline"`

	// @Summary Namespace
	// @Description Namespace
	Namespace string `json:"namespace,omitempty" bson:"namespace" example:"ns-admin"`
	// @Summary App type
	// @Description App type
	AppType string `json:"appType,omitempty"   bson:"appType"   example:"app"`

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

type GetPaymentReq struct {
	// @Summary Payment ID
	// @Description Payment ID
	// @JSONSchema
	PaymentID string `json:"paymentID,omitempty" bson:"paymentID" example:"payment-id-1"`

	// @Summary Invoiced
	// @Description Invoiced
	// @JSONSchema
	Invoiced *bool `json:"invoiced,omitempty" bson:"invoiced" example:"true"`

	// @Summary Authentication information
	// @Description Authentication information
	// @JSONSchema required
	AuthBase `json:",inline" bson:",inline"`

	// @Summary Limit request
	// @Description Limit request
	LimitReq `json:",inline" bson:",inline"`
}

type ApplyInvoiceReq struct {
	// @Summary Authentication information
	// @Description Authentication information
	// @JSONSchema required
	AuthBase `json:",inline" bson:",inline"`

	// payment id list
	// @Summary Payment ID list
	// @Description Payment ID list
	// @JSONSchema required
	PaymentIDList []string `json:"paymentIDList" bson:"paymentIDList" binding:"required" example:"[payment-id-1, payment-id-2]"`

	// invoice detail information json
	// @Summary Invoice detail information
	// @Description Invoice detail information
	// @JSONSchema required
	Detail string `json:"detail" bson:"detail" binding:"required"`
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

type SetInvoiceStatusReq struct {
	// Invoice id list
	// @Summary Invoice ID list
	// @Description Invoice ID list
	// @JSONSchema required
	InvoiceIDList []string `json:"invoiceIDList" bson:"invoiceIDList" binding:"required" example:"[invoice-id-1, invoice-id-2]"`

	// Invoice status
	// @Summary Invoice status
	// @Description Invoice status
	// @JSONSchema required
	Status string `json:"status" bson:"status" binding:"required" example:"COMPLETED,REJECTED,PENDING"`

	// @Summary Authentication information
	// @Description Authentication information
	// @JSONSchema required
	AuthBase `json:",inline" bson:",inline"`
}

type UseGiftCodeReq struct {
	// @Summary Gift code to be used
	// @Description The code of the gift card to be redeemed
	// @JSONSchema required
	Code string `json:"code" bson:"code" binding:"required" example:"HAPPY2024"`

	// @Summary Authentication information
	// @Description Authentication information
	// @JSONSchema required
	AuthBase `json:",inline" bson:",inline"`
}

type GetRealNameInfoReq struct {
	// @Summary Authentication information
	// @Description Authentication information
	// @JSONSchema required
	AuthBase `json:",inline" bson:",inline"`
}

type UserUsageReq struct {
	// @Summary Start and end time for the request
	// @Description Start and end time for the request
	// @JSONSchema required
	TimeRange `json:",inline" bson:",inline"`

	// @Summary Authentication information
	// @Description Authentication information
	// @JSONSchema required
	AuthBase `json:",inline" bson:",inline"`

	// NamespaceList
	// @Summary Namespace list
	// @Description Namespace list
	// @JSONSchema
	NamespaceList []string `json:"namespaceList" bson:"namespaceList" example:"[ns-admin,ns-test1]"`
}

type GetInvoiceReq struct {
	// @Summary Invoice ID
	// @Description Invoice ID
	// @JSONSchema
	InvoiceID string `json:"invoiceID,omitempty" bson:"invoiceID" example:"invoice-id-1"`

	// @Summary Authentication information
	// @Description Authentication information
	// @JSONSchema required
	AuthBase `json:",inline" bson:",inline"`

	// @Summary Limit request
	// @Description Limit request
	LimitReq `json:",inline" bson:",inline"`
}

type GetCostAppListReq struct {
	// @Summary Authentication information
	// @Description Authentication information
	AuthBase `json:",inline" bson:",inline"`

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

type AuthBase struct {
	*Auth `json:",inline" bson:",inline"`
}

func (a *AuthBase) GetAuth() *Auth {
	return a.Auth
}

func (a *AuthBase) SetAuth(auth *Auth) {
	a.Auth = auth
}

type RechargeDiscountResp struct {
	DefaultSteps       map[int64]int64 `json:"defaultSteps"          bson:"defaultSteps"`
	FirstRechargeSteps map[int64]int64 `json:"firstRechargeDiscount" bson:"firstRechargeDiscount"`
}

type NamespaceBillingHistoryResp struct {
	Data    NamespaceBillingHistoryRespData `json:"data,omitempty"    bson:"data,omitempty"`
	Message string                          `json:"message,omitempty" bson:"message"        example:"successfully retrieved namespace list"`
}

type NamespaceBillingHistoryRespData struct {
	List []string `json:"list,omitempty" bson:"list,omitempty" example:"[ns-admin,ns-test1]"`
}

type GetPropertiesResp struct {
	Data    GetPropertiesRespData `json:"data,omitempty"    bson:"data,omitempty"`
	Message string                `json:"message,omitempty" bson:"message"        example:"successfully retrieved properties"`
}

type GetPropertiesRespData struct {
	Properties []common.PropertyQuery `json:"properties,omitempty" bson:"properties,omitempty"`
}

type ErrorMessage struct {
	Error string `json:"error,omitempty" bson:"error,omitempty" example:"authentication failure"`
}

type TimeRange struct {
	StartTime time.Time `json:"startTime" bson:"startTime" example:"2021-01-01T00:00:00Z"`
	EndTime   time.Time `json:"endTime"   bson:"endTime"   example:"2021-12-01T00:00:00Z"`
}

type Auth struct {
	Owner      string    `json:"owner"      bson:"owner"      example:"admin"`
	UserUID    uuid.UUID `json:"userUID"    bson:"userUID"    example:"user-123"`
	UserID     string    `json:"userID"     bson:"userID"     example:"admin"`
	KubeConfig string    `json:"kubeConfig" bson:"kubeConfig"`
	Token      string    `json:"token"      bson:"token"      example:"token"`
}

func ParseNamespaceBillingHistoryReq(c *gin.Context) (*NamespaceBillingHistoryReq, error) {
	nsList := &NamespaceBillingHistoryReq{}
	err := c.ShouldBindJSON(nsList)
	if err != nil {
		return nil, fmt.Errorf("bind json error : %w", err)
	}
	return nsList, nil
}

func ParseSetPaymentInvoiceReq(c *gin.Context) (*SetPaymentInvoiceReq, error) {
	paymentList := &SetPaymentInvoiceReq{}
	err := c.ShouldBindJSON(paymentList)
	if err != nil {
		return nil, fmt.Errorf("bind json error : %w", err)
	}
	return paymentList, nil
}

func ParseTransferAmountReq(c *gin.Context) (*TransferAmountReq, error) {
	transferAmount := &TransferAmountReq{}
	if err := c.ShouldBindJSON(transferAmount); err != nil {
		return nil, fmt.Errorf("bind json error: %w", err)
	}
	if transferAmount.Amount == 0 && !transferAmount.TransferAll {
		return nil, errors.New("transfer amount cannot be empty")
	}
	return transferAmount, nil
}

func ParseConsumptionRecordReq(c *gin.Context) (*ConsumptionRecordReq, error) {
	consumptionRecord := &ConsumptionRecordReq{}
	if err := c.ShouldBindJSON(consumptionRecord); err != nil {
		return nil, fmt.Errorf("bind json error: %w", err)
	}
	setDefaultTimeRange(&consumptionRecord.TimeRange)
	return consumptionRecord, nil
}

func ParseUserTimeRangeReq(c *gin.Context) (*UserTimeRangeReq, error) {
	userCosts := &UserTimeRangeReq{}
	if err := c.ShouldBindJSON(userCosts); err != nil {
		return nil, fmt.Errorf("bind json error: %w", err)
	}
	setDefaultTimeRange(&userCosts.TimeRange)
	return userCosts, nil
}

func ParsePaymentReq(c *gin.Context) (*GetPaymentReq, error) {
	payment := &GetPaymentReq{}
	if err := c.ShouldBindJSON(payment); err != nil {
		return nil, fmt.Errorf("bind json error: %w", err)
	}
	if payment.Page <= 0 {
		payment.Page = 1
	}
	if payment.PageSize <= 0 {
		payment.PageSize = 10
	}
	return payment, nil
}

func ParseAppCostsReq(c *gin.Context) (*AppCostsReq, error) {
	userCosts := &AppCostsReq{}
	if err := c.ShouldBindJSON(userCosts); err != nil {
		return nil, fmt.Errorf("bind json error: %w", err)
	}
	setDefaultTimeRange(&userCosts.TimeRange)
	return userCosts, nil
}

type GetTransferRecordReq struct {
	UserTimeRangeReq `json:",inline" bson:",inline"`

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
		return nil, fmt.Errorf("bind json error: %w", err)
	}
	setDefaultTimeRange(&transferReq.TimeRange)
	return transferReq, nil
}

func ParseGetCostAppListReq(c *gin.Context) (*GetCostAppListReq, error) {
	costAppList := &GetCostAppListReq{}
	if err := c.ShouldBindJSON(costAppList); err != nil {
		return nil, fmt.Errorf("bind json error: %w", err)
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

type LimitResp struct {
	// @Summary Total
	// @Description Total
	Total int64 `json:"total" bson:"total"`

	// @Summary Total page
	// @Description Total page
	TotalPage int64 `json:"totalPage" bson:"totalPage"`
}

func ParseApplyInvoiceReq(c *gin.Context) (*ApplyInvoiceReq, error) {
	applyInvoice := &ApplyInvoiceReq{}
	if err := c.ShouldBindJSON(applyInvoice); err != nil {
		return nil, fmt.Errorf("bind json error: %w", err)
	}
	return applyInvoice, nil
}

func ParseGetInvoiceReq(c *gin.Context) (*GetInvoiceReq, error) {
	invoiceList := &GetInvoiceReq{}
	if err := c.ShouldBindJSON(invoiceList); err != nil {
		return nil, fmt.Errorf("bind json error: %w", err)
	}
	return invoiceList, nil
}

func ParseSetInvoiceStatusReq(c *gin.Context) (*SetInvoiceStatusReq, error) {
	invoiceStatus := &SetInvoiceStatusReq{}
	if err := c.ShouldBindJSON(invoiceStatus); err != nil {
		return nil, fmt.Errorf("bind json error: %w", err)
	}
	return invoiceStatus, nil
}

type UseGiftCodeRespData struct {
	UserID string `json:"userID" bson:"userID" example:"user-123"`
}

type UseGiftCodeResp struct {
	Data    UseGiftCodeRespData `json:"data,omitempty"    bson:"data,omitempty"`
	Message string              `json:"message,omitempty" bson:"message"        example:"Gift code successfully redeemed"`
}

func ParseUseGiftCodeReq(c *gin.Context) (*UseGiftCodeReq, error) {
	useGiftCode := &UseGiftCodeReq{}
	if err := c.ShouldBindJSON(useGiftCode); err != nil {
		return nil, fmt.Errorf("bind json error: %w", err)
	}

	// Additional validation can be added here if needed
	if useGiftCode.Code == "" {
		return nil, errors.New("gift code cannot be empty")
	}

	return useGiftCode, nil
}

type GetRealNameInfoRespData struct {
	UserID     string `json:"userID"     bson:"userID"     example:"user-123"`
	IsRealName bool   `json:"isRealName" bson:"isRealName" example:"true"`
}

type GetRealNameInfoResp struct {
	Data    GetRealNameInfoRespData `json:"data,omitempty"    bson:"data,omitempty"`
	Message string                  `json:"message,omitempty" bson:"message"        example:"Successfully retrieved real name information"`
}

func ParseGetRealNameInfoReq(c *gin.Context) (*GetRealNameInfoReq, error) {
	getRealNameInfoReq := &GetRealNameInfoReq{}
	if err := c.ShouldBindJSON(getRealNameInfoReq); err != nil {
		return nil, fmt.Errorf("bind json error: %w", err)
	}

	return getRealNameInfoReq, nil
}

func ParseUserUsageReq(c *gin.Context) (*UserUsageReq, error) {
	userUsage := &UserUsageReq{}
	if err := c.ShouldBindJSON(userUsage); err != nil {
		return nil, fmt.Errorf("bind json error: %w", err)
	}
	if userUsage.StartTime.IsZero() {
		userUsage.StartTime = time.Now().Add(-2 * time.Minute)
	}
	if userUsage.EndTime.IsZero() {
		userUsage.EndTime = time.Now()
	}
	return userUsage, nil
}

type AdminChargeBillingReq struct {
	Amount    int64     `json:"amount"    bson:"amount"    example:"100000000"`
	Namespace string    `json:"namespace" bson:"namespace" example:"ns-admin"`
	Owner     string    `json:"owner"     bson:"owner"     example:"admin"`
	AppType   string    `json:"appType"   bson:"appType"`
	AppName   string    `json:"appName"   bson:"appName"`
	UserUID   uuid.UUID `json:"userUID"   bson:"userUID"`
}

func ParseAdminChargeBillingReq(c *gin.Context) (*AdminChargeBillingReq, error) {
	rechargeBilling := &AdminChargeBillingReq{}
	if err := c.ShouldBindJSON(rechargeBilling); err != nil {
		return nil, fmt.Errorf("bind json error: %w", err)
	}
	return rechargeBilling, nil
}

type AdminFlushSubscriptionQuotaReq struct {
	UserUID  uuid.UUID `json:"userUID"  bson:"userUID"`
	PlanName string    `json:"planName" bson:"planName"`
	PlanID   uuid.UUID `json:"planID"   bson:"planID"`
}

func ParseAdminFlushSubscriptionQuotaReq(c *gin.Context) (*AdminFlushSubscriptionQuotaReq, error) {
	flushSubscriptionQuota := &AdminFlushSubscriptionQuotaReq{}
	if err := c.ShouldBindJSON(flushSubscriptionQuota); err != nil {
		return nil, fmt.Errorf("bind json error: %w", err)
	}
	if flushSubscriptionQuota.UserUID == uuid.Nil {
		return nil, errors.New("userUID cannot be empty")
	}
	if flushSubscriptionQuota.PlanID == uuid.Nil {
		return nil, errors.New("planID cannot be empty")
	}
	if flushSubscriptionQuota.PlanName == "" {
		return nil, errors.New("planName cannot be empty")
	}
	return flushSubscriptionQuota, nil
}

type AdminFlushDebtResourceStatusReq struct {
	UserUID           uuid.UUID            `json:"userUID"           bson:"userUID"`
	LastDebtStatus    types.DebtStatusType `json:"lastDebtStatus"    bson:"lastDebtStatus"`
	CurrentDebtStatus types.DebtStatusType `json:"currentDebtStatus" bson:"currentDebtStatus"`
	IsBasicUser       bool                 `json:"isBasicUser"       bson:"isBasicUser"`
}

func ParseAdminFlushDebtResourceStatusReq(
	c *gin.Context,
) (*AdminFlushDebtResourceStatusReq, error) {
	flushDebtResourceStatus := &AdminFlushDebtResourceStatusReq{}
	if err := c.ShouldBindJSON(flushDebtResourceStatus); err != nil {
		return nil, fmt.Errorf("bind json error: %w", err)
	}
	if flushDebtResourceStatus.UserUID == uuid.Nil {
		return nil, errors.New("userUID cannot be empty")
	}
	if flushDebtResourceStatus.CurrentDebtStatus == "" {
		return nil, errors.New("currentDebtStatus cannot be empty")
	}
	return flushDebtResourceStatus, nil
}

// WorkspaceSubscription request structures
type WorkspaceSubscriptionOperatorReq struct {
	// @Summary Authentication information
	// @Description Authentication information
	// @JSONSchema required
	AuthBase `json:",inline" bson:",inline"`

	// @Summary Workspace name
	// @Description Workspace name
	// @JSONSchema required
	Workspace string `json:"workspace" bson:"workspace" binding:"required" example:"my-workspace"`

	// @Summary Region domain
	// @Description Region domain
	// @JSONSchema required
	RegionDomain string `json:"regionDomain" bson:"regionDomain" binding:"required" example:"example.com"`

	// @Summary Plan name
	// @Description Plan name
	// @JSONSchema required
	PlanName string `json:"planName" bson:"planName" binding:"required" example:"premium"`

	// @Summary Subscription period
	// @Description Subscription period (1m for monthly, 1y for yearly)
	// @JSONSchema required
	Period types.SubscriptionPeriod `json:"period" bson:"period" binding:"required" example:"1m"`

	// @Summary Payment method
	// @Description Payment method (STRIPE, BALANCE)
	// @JSONSchema required
	PayMethod types.PaymentMethod `json:"payMethod" bson:"payMethod" binding:"required" example:"STRIPE"`

	// @Summary Subscription operator (created/upgraded/downgraded/canceled/renewed)
	// @Description Subscription operator type
	Operator types.SubscriptionOperator `json:"operator" bson:"operator" binding:"required" example:"created"`

	// @Summary Card ID (optional for stripe payments)
	// @Description Card ID for stripe payments
	CardID *uuid.UUID `json:"cardId,omitempty" bson:"cardId,omitempty"`
}

type WorkspaceSubscriptionInfoReq struct {
	// @Summary Authentication information
	// @Description Authentication information
	// @JSONSchema required
	AuthBase `json:",inline" bson:",inline"`

	// @Summary Workspace name
	// @Description Workspace name
	// @JSONSchema required
	Workspace string `json:"workspace" bson:"workspace" binding:"required" example:"my-workspace"`

	// @Summary Region domain
	// @Description Region domain
	// @JSONSchema required
	RegionDomain string `json:"regionDomain" bson:"regionDomain" binding:"required" example:"example.com"`
}

type WorkspaceSubscriptionUpgradeAmountReq struct {
	WorkspaceSubscriptionOperatorReq `json:",inline" bson:",inline"`
}

func ParseWorkspaceSubscriptionOperatorReq(
	c *gin.Context,
) (*WorkspaceSubscriptionOperatorReq, error) {
	req := &WorkspaceSubscriptionOperatorReq{}
	if err := c.ShouldBindJSON(req); err != nil {
		return nil, fmt.Errorf("bind json error: %w", err)
	}
	if req.Workspace == "" {
		return nil, errors.New("workspace cannot be empty")
	}
	if req.RegionDomain == "" {
		return nil, errors.New("regionDomain cannot be empty")
	}
	if req.PlanName == "" {
		return nil, errors.New("planName cannot be empty")
	}
	if req.PayMethod == "" {
		return nil, errors.New("payMethod cannot be empty")
	}
	if req.Period == "" {
		req.Period = types.SubscriptionPeriodMonthly
	}
	req.PayMethod = types.PaymentMethod(strings.ToLower(string(req.PayMethod)))
	if req.Operator == "" {
		return nil, errors.New("operator cannot be empty")
	}
	// Validate operator type - only allow specific operations
	switch req.Operator {
	case types.SubscriptionTransactionTypeCreated,
		types.SubscriptionTransactionTypeUpgraded,
		types.SubscriptionTransactionTypeDowngraded,
		types.SubscriptionTransactionTypeCanceled,
		types.SubscriptionTransactionTypeRenewed:
		// Valid operations
	default:
		return nil, fmt.Errorf(
			"invalid operator: %s. Allowed: created, upgraded, downgraded, canceled, renewed",
			req.Operator,
		)
	}
	return req, nil
}

func ParseWorkspaceSubscriptionInfoReq(c *gin.Context) (*WorkspaceSubscriptionInfoReq, error) {
	req := &WorkspaceSubscriptionInfoReq{}
	if err := c.ShouldBindJSON(req); err != nil {
		return nil, fmt.Errorf("bind json error: %w", err)
	}
	if req.Workspace == "" {
		return nil, errors.New("workspace cannot be empty")
	}
	if req.RegionDomain == "" {
		return nil, errors.New("regionDomain cannot be empty")
	}
	return req, nil
}

type WorkspaceInfoReq struct {
	// @Summary Authentication information
	// @Description Authentication information
	AuthBase `json:",inline" bson:",inline"`

	// @Summary Workspace name
	// @Description Workspace name
	Workspace string `json:"workspace" bson:"workspace" binding:"required" example:"my-workspace"`
}

func ParseWorkspaceInfoReq(c *gin.Context) (*WorkspaceInfoReq, error) {
	req := &WorkspaceInfoReq{}
	if err := c.ShouldBindJSON(req); err != nil {
		return nil, fmt.Errorf("bind json error: %w", err)
	}
	if req.Workspace == "" {
		return nil, errors.New("workspace cannot be empty")
	}
	return req, nil
}

type PaymentStatusReq struct {
	AuthBase `json:",inline" bson:",inline"`

	PayID string `json:"payID" bson:"payID" binding:"required" example:"pay-123"`
}

func ParsePaymentStatusReq(c *gin.Context) (*PaymentStatusReq, error) {
	req := &PaymentStatusReq{}
	if err := c.ShouldBindJSON(req); err != nil {
		return nil, fmt.Errorf("bind json error: %w", err)
	}
	if req.PayID == "" {
		return nil, errors.New("payID cannot be empty")
	}
	return req, nil
}

// AdminWorkspaceSubscriptionAddReq defines request for admin to add workspace subscription
type AdminWorkspaceSubscriptionAddReq struct {
	// @Summary Workspace name
	// @Description Workspace name
	// @JSONSchema required
	Workspace string `json:"workspace" bson:"workspace" binding:"required" example:"my-workspace"`

	// @Summary Region domain
	// @Description Region domain
	// @JSONSchema required
	RegionDomain string `json:"regionDomain" bson:"regionDomain" binding:"required" example:"example.com"`

	// @Summary User ID
	// @Description User ID who owns the workspace
	// @JSONSchema required
	UserUID uuid.UUID `json:"userUID" bson:"userUID" binding:"required" example:"user-123"`

	// @Summary Plan name
	// @Description Plan name for the subscription
	// @JSONSchema required
	PlanName string `json:"planName" bson:"planName" binding:"required" example:"premium"`

	// @Summary Subscription period
	// @Description Subscription period (1m for monthly, 1y for yearly)
	// @JSONSchema required
	Period types.SubscriptionPeriod `json:"period" bson:"period" binding:"required" example:"1m"`

	// @Summary Subscription operator
	// @Description Subscription operator type (created/upgraded/renewed)
	Operator types.SubscriptionOperator `json:"operator" bson:"operator" binding:"required" example:"created"`

	// @Summary Optional description
	// @Description Optional description for the admin operation
	Description string `json:"description,omitempty" bson:"description,omitempty" example:"Internal admin subscription addition"`
}

func ParseAdminWorkspaceSubscriptionAddReq(c *gin.Context) (*AdminWorkspaceSubscriptionAddReq, error) {
	req := &AdminWorkspaceSubscriptionAddReq{}
	if err := c.ShouldBindJSON(req); err != nil {
		return nil, fmt.Errorf("bind json error: %w", err)
	}

	// Validate required fields
	if req.Workspace == "" {
		return nil, errors.New("workspace cannot be empty")
	}
	if req.RegionDomain == "" {
		return nil, errors.New("regionDomain cannot be empty")
	}
	if req.UserUID == uuid.Nil {
		return nil, errors.New("userUID cannot be empty")
	}
	if req.PlanName == "" {
		return nil, errors.New("planName cannot be empty")
	}
	if req.Period == "" {
		req.Period = types.SubscriptionPeriodMonthly
	}
	if req.Operator == "" {
		req.Operator = types.SubscriptionTransactionTypeCreated
	}

	// Validate operator type
	switch req.Operator {
	case types.SubscriptionTransactionTypeCreated,
		types.SubscriptionTransactionTypeUpgraded,
		types.SubscriptionTransactionTypeRenewed:
		// Valid operations for admin
	default:
		return nil, fmt.Errorf(
			"invalid operator: %s. Allowed: created, upgraded, renewed",
			req.Operator,
		)
	}

	return req, nil
}

// WorkspaceSubscriptionPlansReq defines request for getting subscription plans by namespaces
type WorkspaceSubscriptionPlansReq struct {
	// @Summary Authentication information
	// @Description Authentication information
	// @JSONSchema required
	AuthBase `json:",inline" bson:",inline"`

	// @Summary Namespace list
	// @Description List of workspace namespaces to query subscription plans for
	// @JSONSchema required
	Namespaces []string `json:"namespaces" bson:"namespaces" binding:"required" example:"[ns-admin, ns-test1, ns-dev]"`
}

func ParseWorkspaceSubscriptionPlansReq(c *gin.Context) (*WorkspaceSubscriptionPlansReq, error) {
	req := &WorkspaceSubscriptionPlansReq{}
	if err := c.ShouldBindJSON(req); err != nil {
		return nil, fmt.Errorf("bind json error: %w", err)
	}

	// Validate namespaces list
	if len(req.Namespaces) == 0 {
		return nil, errors.New("namespaces list cannot be empty")
	}

	// Validate each namespace is not empty
	for _, ns := range req.Namespaces {
		if ns == "" {
			return nil, errors.New("namespace cannot be empty")
		}
	}

	return req, nil
}
