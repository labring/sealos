package types

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type PaymentRaw struct {
	UserUID         uuid.UUID `gorm:"column:userUid;type:uuid;not null"`
	RegionUID       uuid.UUID `gorm:"column:regionUid;type:uuid;not null"`
	CreatedAt       time.Time `gorm:"type:timestamp(3) with time zone;default:current_timestamp()"`
	RegionUserOwner string    `gorm:"column:regionUserOwner;type:text;not null"`
	Method          string    `gorm:"type:text;not null"`
	Amount          int64     `gorm:"type:bigint;not null"`
	Gift            int64     `gorm:"type:bigint"`
	// 订单号
	TradeNO string `gorm:"type:text;unique;not null"`
	// CodeURL is the codeURL of wechatpay
	CodeURL      string       `gorm:"type:text"`
	InvoicedAt   bool         `gorm:"type:boolean;default:false"`
	Remark       string       `gorm:"type:text"`
	ActivityType ActivityType `gorm:"type:text;column:activityType"`
	Message      string       `gorm:"type:text;not null"`
	//TODO 初始化判断 新加字段
	CardUID      *uuid.UUID   `gorm:"type:uuid"`
	Type         PaymentType  `gorm:"type:text"` // 交易类型: AccountRecharge, Subscription，UpgradeSubscription...
	ChargeSource ChargeSource `gorm:"type:text"`
}

type ChargeSource string

const (
	ChargeSourceBalance ChargeSource = "BALANCE"
	ChargeSourceCard    ChargeSource = "CARD"
)

type PaymentOrder struct {
	ID string `gorm:"type:text;primary_key"`
	PaymentRaw
	// 支付状态
	Status PaymentOrderStatus `gorm:"type:text;column:status;not null"`
}

type (
	PaymentOrderStatus string
	CardPaymentStatus  string
	PaymentType        string
)

const (
	PaymentOrderStatusPending PaymentOrderStatus = "PENDING"
	PaymentOrderStatusSuccess PaymentOrderStatus = "SUCCESS"
	PaymentOrderStatusFailed  PaymentOrderStatus = "FAILED"

	CardPaymentStatusActive CardPaymentStatus = "ACTIVE"
	//    "paymentStatus": "FAIL",
	//    "paymentResultCode": "ACCESS_DENIED",
	//    "paymentResultMessage": "Access denied.",
	CardPaymentStatusFail CardPaymentStatus = "FAIL"
)

const (
	PaymentTypeAccountRecharge PaymentType = "ACCOUNT_RECHARGE"
	PaymentTypeSubscription    PaymentType = "SUBSCRIPTION"
)

func (PaymentOrder) TableName() string {
	return "PaymentOrder"
}

type ActivityType string

const (
	ActivityTypeFirstRecharge ActivityType = "FIRST_RECHARGE"
)

type Payment struct {
	ID string `gorm:"type:text;primary_key"`
	PaymentRaw
}

func (Payment) TableName() string {
	return "Payment"
}

type CardInfo struct {
	ID                   uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserUID              uuid.UUID `gorm:"type:uuid;not null"`
	CardNo               string    `gorm:"type:text"`
	CardBrand            string    `gorm:"type:text"`
	CardToken            string    `gorm:"type:text;unique"`
	CreatedAt            time.Time `gorm:"type:timestamp(3) with time zone;default:current_timestamp()"`
	NetworkTransactionID string    `gorm:"type:text"`
	Default              bool      `gorm:"type:boolean;default:false"`
	//上次支付状态
	LastPaymentStatus PaymentOrderStatus `gorm:"type:text"`
}

func (CardInfo) TableName() string {
	return "CardInfo"
}

// PaymentNotificationType 支付通知类型
const (
	PaymentResultNotification  = "PAYMENT_RESULT"
	PaymentPendingNotification = "PAYMENT_PENDING"
)

// PaymentNotification 支付通知请求结构体
type PaymentNotification struct {
	NotifyType               string            `json:"notifyType"`
	Result                   Result            `json:"result"`
	PaymentRequestID         string            `json:"paymentRequestId"`
	PaymentID                string            `json:"paymentId"`
	PaymentAmount            Amount            `json:"paymentAmount"`
	PaymentCreateTime        time.Time         `json:"paymentCreateTime"`
	PaymentTime              *time.Time        `json:"paymentTime,omitempty"`
	PspCustomerInfo          *PspCustomerInfo  `json:"pspCustomerInfo,omitempty"`
	CustomsDeclarationAmount *Amount           `json:"customsDeclarationAmount,omitempty"`
	GrossSettlementAmount    *Amount           `json:"grossSettlementAmount,omitempty"`
	SettlementQuote          *Quote            `json:"settlementQuote,omitempty"`
	AcquirerReferenceNo      string            `json:"acquirerReferenceNo,omitempty"`
	PaymentResultInfo        interface{}       `json:"paymentResultInfo,omitempty"`
	PromotionResult          []PromotionResult `json:"promotionResult,omitempty"`
	PaymentMethodType        string            `json:"paymentMethodType,omitempty"`
}

// PspCustomerInfo PSP客户信息
type PspCustomerInfo struct {
	PspName           string `json:"pspName,omitempty"`
	PspCustomerID     string `json:"pspCustomerId,omitempty"`
	DisplayCustomerID string `json:"displayCustomerId,omitempty"`
}

// Quote 汇率信息
type Quote struct {
	Guaranteed        bool       `json:"guaranteed,omitempty"`
	QuoteCurrencyPair string     `json:"quoteCurrencyPair"`
	QuoteExpiryTime   *time.Time `json:"quoteExpiryTime,omitempty"`
	QuoteID           string     `json:"quoteId,omitempty"`
	QuotePrice        string     `json:"quotePrice"`
	QuoteStartTime    *time.Time `json:"quoteStartTime,omitempty"`
}

// PromotionResult 优惠结果
type PromotionResult struct {
	PromotionType string    `json:"promotionType"`
	Discount      *Discount `json:"discount,omitempty"`
}

// Discount 折扣信息
type Discount struct {
	// 根据实际需求添加字段
	DiscountAmount Amount `json:"discountAmount"`
}

// Result 通用结果结构体
type Result struct {
	ResultCode    string `json:"resultCode"`
	ResultMessage string `json:"resultMessage"`
	ResultStatus  string `json:"resultStatus"`
}

// Amount 通用金额结构体
type Amount struct {
	Currency string `json:"currency"`
	Value    string `json:"value"`
}

// CommonResponse 通用响应结构体
type CommonResponse struct {
	Result Result `json:"result"`
}

func (c *CommonResponse) Raw() []byte {
	data, _ := json.Marshal(c)
	return data
}

// NewSuccessResponse 创建成功响应
func NewSuccessResponse() CommonResponse {
	return CommonResponse{
		Result: Result{
			ResultCode:    "SUCCESS",
			ResultMessage: "success",
			ResultStatus:  "S",
		},
	}
}
