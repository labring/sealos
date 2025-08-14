package types

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type PaymentRaw struct {
	UserUID         uuid.UUID `gorm:"column:userUid;type:uuid;not null"`
	RegionUID       uuid.UUID `gorm:"column:regionUid;type:uuid;not null"`
	CreatedAt       time.Time `gorm:"type:timestamp(3) with time zone;default:current_timestamp"`
	RegionUserOwner string    `gorm:"column:regionUserOwner;type:text"`
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
	// TODO 初始化判断 新加字段
	CardUID      *uuid.UUID    `gorm:"type:uuid"`
	Type         PaymentType   `gorm:"type:text"` // 交易类型: AccountRecharge, Subscription，UpgradeSubscription...
	ChargeSource ChargeSource  `gorm:"type:text"`
	Status       PaymentStatus `gorm:"type:text;column:status;not null"`
}

type ChargeSource string

const (
	ChargeSourceBalance  ChargeSource = "BALANCE"
	ChargeSourceNewCard  ChargeSource = "CARD"
	ChargeSourceBindCard ChargeSource = "BIND_CARD"
)

type PaymentOrder struct {
	ID string `gorm:"type:text;primary_key"`
	PaymentRaw
	// 支付状态
	Status PaymentOrderStatus `gorm:"type:text;column:status;not null"`
}

type (
	PaymentStatus      string
	PaymentOrderStatus string
	CardPaymentStatus  string
	PaymentType        string
)

const (
	PaymentStatusPAID     PaymentStatus = "PAID"
	PaymentStatusRefunded PaymentStatus = "REFUNDED"
)

const (
	// PaymentOrderStatusPending TODO will delete
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
	CardToken            string    `gorm:"type:text"`
	CreatedAt            time.Time `gorm:"type:timestamp(3) with time zone;default:current_timestamp"`
	NetworkTransactionID string    `gorm:"type:text"`
	Default              bool      `gorm:"type:boolean;default:false"`
	// 上次支付状态
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
	PaymentResultInfo        any               `json:"paymentResultInfo,omitempty"`
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

const (
	NotifyTypePaymentResult = "PAYMENT_RESULT"
	NotifyTypeCaptureResult = "CAPTURE_RESULT"
)

const OrderClosedResultCode = "ORDER_IS_CLOSED"

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
	//nolint:errchkjson
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

// CaptureNotification 请款通知请求结构体
type CaptureNotification struct {
	Result              Result     `json:"result"`
	NotifyType          string     `json:"notifyType"`                    // 通知类型，固定为CAPTURE_RESULT
	CaptureRequestID    string     `json:"captureRequestId"`              // 商户分配的请款请求ID
	PaymentID           string     `json:"paymentId"`                     // 支付ID
	CaptureID           string     `json:"captureId"`                     // 请款ID
	CaptureAmount       Amount     `json:"captureAmount"`                 // 请款金额
	CaptureTime         *time.Time `json:"captureTime,omitempty"`         // 请款完成时间
	AcquirerReferenceNo string     `json:"acquirerReferenceNo,omitempty"` // 收单机构交易ID
}

// CaptureResponse 请款通知响应结构体
type CaptureResponse struct {
	Result Result `json:"result"`
}

// Raw 返回JSON格式的字节数组
func (c *CaptureResponse) Raw() []byte {
	//nolint:errchkjson
	data, _ := json.Marshal(c)
	return data
}

type PaymentRefund struct {
	TradeNo string `json:"tradeNo"      gorm:"type:uuid;not null"`
	ID      string `json:"Id"           gorm:"type:string;not null"`       // 外键 跟payment关联
	Method  string `json:"method"       gorm:"type:varchar(255);not null"` // 退款方式
	// OutTradeNo   string    `json:"outTradeNo" gorm:"type:uuid"`
	RefundNo     string    `json:"refundNo"     gorm:"type:string;not null"`
	RefundAmount int64     `json:"refundAmount" gorm:"type:float;not null"`
	DeductAmount int64     `json:"deductAmount" gorm:"type:float;not null"` // 从 account的 balance里面扣款
	CreatedAt    time.Time `json:"createdAt"    gorm:"type:timestamp(3) with time zone;default:current_timestamp"`
	RefundReason string    `json:"refundReason" gorm:"type:text"`
}

func (PaymentRefund) TableName() string {
	return "PaymentRefund"
}

type Corporate struct {
	UserUID             string    `json:"userUid" gorm:"type:string;not null"`
	ID                  string    `json:"Id" gorm:"type:string;not null"`
	ReceiptSerialNumber string    `json:"receiptSerialNumber" gorm:"type:string;not null"`
	PayerName           string    `json:"payerName" gorm:"type:varchar(255);not null"`
	PaymentAmount       int64     `json:"paymentAmount" gorm:"type:float;not null"`
	GiftAmount          int64     `json:"giftAmount" gorm:"type:float;not null"`
	PayDate             time.Time `json:"payDate" gorm:"type:timestamp(3) with time zone;default:current_timestamp"`
	CreationDate        time.Time `json:"creationDate" gorm:"type:timestamp(3) with time zone;default:current_timestamp"`
	Type                string    `json:"type" gorm:"type:varchar(255);not null"`
}

func (Corporate) TableName() string {
	return "Corporate"
}
