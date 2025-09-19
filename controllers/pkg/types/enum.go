package types

import (
	"database/sql/driver"
	"fmt"
)

type SubscriptionStatus string

const (
	SubscriptionStatusNormal SubscriptionStatus = "NORMAL"
	// initialize the state of the subscription space the pause state
	SubscriptionStatusPaused            SubscriptionStatus = "PAUSED"
	SubscriptionStatusDebt              SubscriptionStatus = "DEBT"
	SubscriptionStatusDebtPreDeletion   SubscriptionStatus = "DEBT_PRE_DELETION"
	SubscriptionStatusDebtFinalDeletion SubscriptionStatus = "DEBT_FINAL_DELETION"
	SubscriptionStatusDeleted           SubscriptionStatus = "DELETED"
)

func (s *SubscriptionStatus) Scan(value interface{}) error {
	if value == nil {
		*s = ""
		return nil
	}
	sv, ok := value.(string)
	if !ok {
		return fmt.Errorf("failed to scan SubscriptionStatus: %v", value)
	}
	*s = SubscriptionStatus(sv)
	return nil
}

func (s *SubscriptionStatus) Value() (driver.Value, error) {
	return string(*s), nil
}

type SubscriptionOperator string

const (
	SubscriptionTransactionTypeCreated    SubscriptionOperator = "created"
	SubscriptionTransactionTypeUpgraded   SubscriptionOperator = "upgraded"
	SubscriptionTransactionTypeDowngraded SubscriptionOperator = "downgraded"
	SubscriptionTransactionTypeCanceled   SubscriptionOperator = "canceled"
	SubscriptionTransactionTypeDeleted    SubscriptionOperator = "deleted"
	SubscriptionTransactionTypeRenewed    SubscriptionOperator = "renewed"
	// 续订余额失败状态
	SubscriptionTransactionTypeRenewFailed SubscriptionOperator = "renew_failed"

	// 到期未续费
	SubscriptionTransactionTypeDebt SubscriptionOperator = "debt"

	SubscriptionTransactionTypeOther SubscriptionOperator = "other"
	// SubscriptionTransactionTypePayStatusChanged SubscriptionOperator = "pay_status_changed"
)

func (o *SubscriptionOperator) Scan(value interface{}) error {
	if value == nil {
		*o = ""
		return nil
	}
	ov, ok := value.(string)
	if !ok {
		return fmt.Errorf("failed to scan SubscriptionOperator: %v", value)
	}
	*o = SubscriptionOperator(ov)
	return nil
}

func (o *SubscriptionOperator) Value() (driver.Value, error) {
	return string(*o), nil
}

type PaymentMethod string

const (
	PaymentMethodErrAndUseBalance PaymentMethod = "err_and_use_balance" // 支付失败转余额支付
	PaymentMethodCorporate        PaymentMethod = "corporate"           // 企业转账支付
	PaymentMethodBalance          PaymentMethod = "balance"             // 余额支付
	PaymentMethodStripe           PaymentMethod = "stripe"              // Stripe 支付
)

type SubscriptionPayStatus string

const (
	SubscriptionPayStatusPending    SubscriptionPayStatus = "pending"
	SubscriptionPayStatusProcessing SubscriptionPayStatus = "processing"
	SubscriptionPayStatusCanceled   SubscriptionPayStatus = "canceled"
	SubscriptionPayStatusPaid       SubscriptionPayStatus = "paid"
	SubscriptionPayStatusUnpaid     SubscriptionPayStatus = "unpaid"
	SubscriptionPayStatusNoNeed     SubscriptionPayStatus = "no_need"
	SubscriptionPayStatusFailed     SubscriptionPayStatus = "failed"
	SubscriptionPayStatusExpired    SubscriptionPayStatus = "expired"
	// 表示续订失败后，使用余额支付成功
	SubscriptionPayStatusFailedAndUseBalance SubscriptionPayStatus = "failed_and_use_balance"
)

func (p *SubscriptionPayStatus) Scan(value interface{}) error {
	if value == nil {
		*p = ""
		return nil
	}
	pv, ok := value.(string)
	if !ok {
		return fmt.Errorf("failed to scan SubscriptionPayStatus: %v", value)
	}
	*p = SubscriptionPayStatus(pv)
	return nil
}

func (p *SubscriptionPayStatus) Value() (driver.Value, error) {
	return string(*p), nil
}

type SubscriptionPeriod string

const (
	SubscriptionPeriodMonthly SubscriptionPeriod = "1m"
	SubscriptionPeriodYearly  SubscriptionPeriod = "1y"
)

func (p *SubscriptionPeriod) Scan(value interface{}) error {
	if value == nil {
		*p = ""
		return nil
	}
	pv, ok := value.(string)
	if !ok {
		return fmt.Errorf("failed to scan SubscriptionPeriod: %v", value)
	}
	*p = SubscriptionPeriod(pv)
	return nil
}

func (p SubscriptionPeriod) Value() (driver.Value, error) {
	return string(p), nil
}

type WorkspaceTrafficStatus string

const (
	WorkspaceTrafficStatusActive    WorkspaceTrafficStatus = "active"
	WorkspaceTrafficStatusExhausted WorkspaceTrafficStatus = "exhausted"
	WorkspaceTrafficStatusUsedUp    WorkspaceTrafficStatus = "used_up"
	WorkspaceTrafficStatusExpired   WorkspaceTrafficStatus = "expired"
)

func (t *WorkspaceTrafficStatus) Scan(value interface{}) error {
	if value == nil {
		*t = ""
		return nil
	}
	tv, ok := value.(string)
	if !ok {
		return fmt.Errorf("failed to scan WorkspaceTrafficStatus: %v", value)
	}
	*t = WorkspaceTrafficStatus(tv)
	return nil
}

func (t WorkspaceTrafficStatus) Value() (driver.Value, error) {
	return string(t), nil
}

type SubscriptionTransactionStatus string

const (
	SubscriptionTransactionStatusCompleted  SubscriptionTransactionStatus = "completed"
	SubscriptionTransactionStatusPending    SubscriptionTransactionStatus = "pending"
	SubscriptionTransactionStatusProcessing SubscriptionTransactionStatus = "processing"
	SubscriptionTransactionStatusFailed     SubscriptionTransactionStatus = "failed"
	SubscriptionTransactionStatusCanceled   SubscriptionTransactionStatus = "canceled"
)

func (s *SubscriptionTransactionStatus) Scan(value interface{}) error {
	if value == nil {
		*s = ""
		return nil
	}
	sv, ok := value.(string)
	if !ok {
		return fmt.Errorf("failed to scan SubscriptionTransactionStatus: %v", value)
	}
	*s = SubscriptionTransactionStatus(sv)
	return nil
}
