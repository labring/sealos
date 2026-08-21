package helper

import (
	"time"

	"github.com/google/uuid"
)

type AdminPage struct {
	PageIndex  int   `json:"pageIndex"`
	PageSize   int   `json:"pageSize"`
	TotalItems int64 `json:"totalItems"`
	TotalPages int   `json:"totalPages"`
}

type AdminUserListReq struct {
	PageIndex     int
	PageSize      int
	ID            string
	Username      string
	Phone         string
	WorkspaceID   string
	WorkspaceName string
}

type AdminUser struct {
	UID                 uuid.UUID `json:"uid"`
	ID                  string    `json:"id"`
	Username            string    `json:"username"`
	Nickname            string    `json:"nickname"`
	Status              string    `json:"status"`
	Phone               string    `json:"phone"`
	Email               string    `json:"email"`
	SourceType          string    `json:"sourceType"`
	SourceProviderTypes []string  `json:"sourceProviderTypes"`
	Balance             *int64    `json:"balance"`
	DeductionBalance    *int64    `json:"deductionBalance"`
	AvailableBalance    *int64    `json:"availableBalance"`
	BillingStatus       string    `json:"billingStatus"`
	Role                string    `json:"role,omitempty"`
}

type AdminUserListResp struct {
	AdminPage
	List []AdminUser `json:"list"`
}

type AdminWorkspace struct {
	UID         uuid.UUID `json:"uid"`
	ID          string    `json:"id"`
	DisplayName string    `json:"displayName"`
	Role        string    `json:"role"`
	Status      string    `json:"status"`
	IsPrivate   bool      `json:"isPrivate"`
}

type AdminUserDetail struct {
	AdminUser
	RealName       string           `json:"realName"`
	IDCard         string           `json:"idCard"`
	UserType       string           `json:"userType"`
	ProductSeries  []string         `json:"productSeries"`
	RechargeAmount int64            `json:"rechargeAmount"`
	Workspaces     []AdminWorkspace `json:"workspaces"`
}

type AdminRechargeRecord struct {
	ID           string       `json:"id"`
	TradeNo      string       `json:"tradeNo"`
	CreatedAt    time.Time    `json:"createdAt"`
	Method       string       `json:"method"`
	Status       string       `json:"status"`
	Amount       int64        `json:"amount"`
	Gift         *int64       `json:"gift"`
	Type         string       `json:"type"`
	ChargeSource string       `json:"chargeSource"`
	Refunded     bool         `json:"refunded"`
	RefundCount  int          `json:"refundCount"`
	LatestRefund *AdminRefund `json:"latestRefund"`
}

type AdminRefund struct {
	ID           string    `json:"id"`
	RefundNo     string    `json:"refundNo"`
	RefundAmount int64     `json:"refundAmount"`
	DeductAmount int64     `json:"deductAmount"`
	CreatedAt    time.Time `json:"createdAt"`
	RefundReason string    `json:"refundReason"`
}

type AdminRechargeRecordsResp struct {
	AdminPage
	List []AdminRechargeRecord `json:"list"`
}

type AdminBalanceAdjustRecord struct {
	ID            uuid.UUID `json:"id"`
	CreatedAt     time.Time `json:"createdAt"`
	Type          string    `json:"type"`
	Amount        *int64    `json:"amount"`
	BalanceBefore *int64    `json:"balanceBefore"`
	BalanceAfter  int64     `json:"balanceAfter"`
	Message       string    `json:"message"`
}

type AdminBalanceAdjustRecordsResp struct {
	AdminPage
	List []AdminBalanceAdjustRecord `json:"list"`
}

type AdminGiftCode struct {
	ID           uuid.UUID  `json:"id"`
	Code         string     `json:"code"`
	Used         bool       `json:"used"`
	CreditAmount int64      `json:"creditAmount"`
	UsedBy       *uuid.UUID `json:"usedBy"`
	UsedAt       *time.Time `json:"usedAt"`
	CreatedAt    time.Time  `json:"createdAt"`
	ExpiredAt    *time.Time `json:"expiredAt"`
	Comment      string     `json:"comment"`
	CreatedBy    string     `json:"createdBy"`
	CreatedByID  string     `json:"createdById"`
	RechargeType string     `json:"rechargeType"`
}

type AdminGiftCodeListReq struct {
	PageIndex    int
	PageSize     int
	Status       string
	StartTime    *time.Time
	EndTime      *time.Time
	ID           string
	Code         string
	Comment      string
	RechargeType string
}

type AdminGiftCodeListResp struct {
	AdminPage
	List []AdminGiftCode `json:"list"`
}

type AdminGiftCodeUsage struct {
	ID           uuid.UUID  `json:"id"`
	Code         string     `json:"code"`
	CreditAmount int64      `json:"creditAmount"`
	UsedAt       *time.Time `json:"usedAt"`
	RechargeType string     `json:"rechargeType"`
	Comment      string     `json:"comment"`
}

type AdminGiftCodeUsageResp struct {
	AdminPage
	List []AdminGiftCodeUsage `json:"list"`
}

type AdminInvoice struct {
	ID          string     `json:"id"`
	UserID      string     `json:"userID"`
	CreatedAt   *time.Time `json:"createdAt"`
	UpdatedAt   *time.Time `json:"updatedAt"`
	Detail      string     `json:"detail"`
	Remark      string     `json:"remark"`
	TotalAmount int64      `json:"totalAmount"`
	Status      string     `json:"status"`
}

type AdminInvoiceListReq struct {
	PageIndex   int
	PageSize    int
	Status      string
	CompanyName string
}

type AdminInvoiceListResp struct {
	AdminPage
	List []AdminInvoice `json:"list"`
}

type AdminRefundStatusResp struct {
	Refunded     bool         `json:"refunded"`
	RefundCount  int          `json:"refundCount"`
	TradeNo      string       `json:"tradeNo"`
	LatestRefund *AdminRefund `json:"latestRefund"`
}

type AdminRechargeGiftPolicy struct {
	DefaultDiscountSteps       map[string]int64 `json:"defaultDiscountSteps"`
	FirstRechargeDiscountSteps map[string]int64 `json:"firstRechargeDiscountSteps"`
}

type AdminRegion struct {
	UID         uuid.UUID `json:"uid"`
	DisplayName string    `json:"displayName"`
	Location    string    `json:"location"`
	Domain      string    `json:"domain"`
	Description string    `json:"description"`
}
