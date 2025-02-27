package types

import (
	"time"

	"github.com/google/uuid"
)

// Credits 表示用户的credits信息
type Credits struct {
	ID         uuid.UUID         `json:"id"`                 // Credits ID
	UserUID    uuid.UUID         `json:"user_uid"`           // 用户ID，与现有系统绑定
	Amount     int64             `json:"amount"`             // credits额度
	UsedAmount int64             `json:"used_amount"`        // 已使用额度
	ExpireAt   time.Time         `json:"expire_at"`          // 过期时间
	CreatedAt  time.Time         `json:"created_at"`         // 创建时间
	StartAt    time.Time         `json:"start_at"`           // 开始时间
	Status     CreditsStatus     `json:"status"`             // 状态：active（有效）, expired（过期）, used_up（已用完）
	Metadata   map[string]string `json:"metadata,omitempty"` // 其他元数据
}

type CreditsStatus string
type CreditsRecordType string
type CreditsRecordReason string

const (
	CreditsStatusActive  CreditsStatus = "active"
	CreditsStatusExpired CreditsStatus = "expired"
	CreditsStatusUsedUp  CreditsStatus = "used_up"

	CreditsRecordTypeIssue   CreditsRecordType = "issue"
	CreditsRecordTypeConsume CreditsRecordType = "consume"

	CreditsRecordReasonResourceAccountTransaction CreditsRecordReason = "AccountTransaction"
)

// CreditsTransaction 表示credits的使用或发放记录
type CreditsTransaction struct {
	ID                   uuid.UUID           `json:"id"`                               // 记录ID
	UserUID              uuid.UUID           `json:"user_uid"`                         // 用户ID
	AccountTransactionID *uuid.UUID          `json:"account_transaction_id,omitempty"` // 关联的AccountTransaction ID
	CreditsID            uuid.UUID           `json:"credits_id"`                       // 关联的Credits ID
	UsedAmount           int64               `json:"used_amount"`                      // 使用额度
	CreatedAt            time.Time           `json:"created_at"`                       // 操作时间
	Reason               CreditsRecordReason `json:"reason"`                           // 操作原因（如"AccountTransaction"）
}

func (Credits) TableName() string {
	return "Credits"
}

func (CreditsTransaction) TableName() string {
	return "CreditsTransaction"
}
