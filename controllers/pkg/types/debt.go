package types

import (
	"time"

	"github.com/google/uuid"
)

const (
	DebtNamespaceAnnoStatusKey                       = "debt.sealos/status"
	NormalDebtNamespaceAnnoStatus                    = "Normal"
	SuspendDebtNamespaceAnnoStatus                   = "Suspend"
	SuspendCompletedDebtNamespaceAnnoStatus          = "SuspendCompleted"
	FinalDeletionDebtNamespaceAnnoStatus             = "FinalDeletion"
	FinalDeletionCompletedDebtNamespaceAnnoStatus    = "FinalDeletionCompleted"
	ResumeDebtNamespaceAnnoStatus                    = "Resume"
	ResumeCompletedDebtNamespaceAnnoStatus           = "ResumeCompleted"
	TerminateSuspendDebtNamespaceAnnoStatus          = "TerminateSuspend"
	TerminateSuspendCompletedDebtNamespaceAnnoStatus = "TerminateSuspendCompleted"

	NetworkStatusAnnoKey                         = "network.sealos.io/status"
	WorkspaceSubscriptionStatusAnnoKey           = "subscription.sealos.io/status"
	WorkspaceSubscriptionStatusUpdateTimeAnnoKey = "subscription.sealos.io/status-update-time"
	NetworkSuspend                               = "Suspend"
	NetworkSuspendCompleted                      = "SuspendCompleted"
	NetworkResume                                = "Resume"
	NetworkResumeCompleted                       = "ResumeCompleted"
)

// DebtStatusType 定义债务状态类型
type DebtStatusType string

// 定义状态常量
const (
	NormalPeriod          DebtStatusType = "NormalPeriod"
	LowBalancePeriod      DebtStatusType = "LowBalancePeriod"
	CriticalBalancePeriod DebtStatusType = "CriticalBalancePeriod"
	DebtPeriod            DebtStatusType = "DebtPeriod"
	DebtDeletionPeriod    DebtStatusType = "DebtDeletionPeriod"
	FinalDeletionPeriod   DebtStatusType = "FinalDeletionPeriod"
)

const (
	DebtPrefix = "debt-"
	DaySecond  = 24 * 60 * 60
)

var StatusMap = map[DebtStatusType]int{
	NormalPeriod:          0,
	LowBalancePeriod:      1,
	CriticalBalancePeriod: 2,
	DebtPeriod:            3,
	DebtDeletionPeriod:    4,
	FinalDeletionPeriod:   5,
}

var (
	NonDebtStates = []DebtStatusType{NormalPeriod, LowBalancePeriod, CriticalBalancePeriod}
	DebtStates    = []DebtStatusType{DebtPeriod, DebtDeletionPeriod, FinalDeletionPeriod}
)

func ContainDebtStatus(statuses []DebtStatusType, status DebtStatusType) bool {
	for _, s := range statuses {
		if s == status {
			return true
		}
	}
	return false
}

// Debt 表示 debts 表
type Debt struct {
	UserUID           uuid.UUID          `gorm:"column:user_uid;type:uuid;not null;primary_key"`
	CreatedAt         time.Time          `gorm:"column:created_at;autoCreateTime;default:current_timestamp"` // 创建时间
	UpdatedAt         time.Time          `gorm:"column:updated_at;autoUpdateTime;default:current_timestamp"` // 更新时间
	AccountDebtStatus DebtStatusType     `gorm:"column:account_debt_status;not null"                        json:"account_debt_status,omitempty"`
	StatusRecords     []DebtStatusRecord `gorm:"foreignKey:UserUID;references:UserUID"`
}

// DebtStatusRecord 表示 debt_status_records 表
type DebtStatusRecord struct {
	ID            uuid.UUID      `gorm:"column:id;type:uuid;default:gen_random_uuid();primary_key"`
	UserUID       uuid.UUID      `gorm:"column:user_uid;type:uuid;not null"                                 json:"user_uid"` // 外键，关联 User.ID
	LastStatus    DebtStatusType `gorm:"column:last_status"                                                 json:"last_status,omitempty"`
	CurrentStatus DebtStatusType `gorm:"column:current_status"                                              json:"current_status,omitempty"`
	CreateAt      time.Time      `gorm:"column:create_at;not null;autoCreateTime;default:current_timestamp" json:"create_at,omitempty"`
}

func (Debt) TableName() string {
	return "Debt"
}

func (DebtStatusRecord) TableName() string {
	return "DebtStatusRecord"
}

type DebtResumeDeductionBalanceTransaction struct {
	ID                     uuid.UUID `json:"id"                       gorm:"column:id;type:uuid;default:gen_random_uuid();primary_key"`
	UserUID                uuid.UUID `json:"user_uid"                 gorm:"column:user_uid;type:uuid;not null"`
	BeforeDeductionBalance int64     `json:"before_deduction_balance" gorm:"column:before_deduction_balance;not null"`
	AfterDeductionBalance  int64     `json:"after_deduction_balance"  gorm:"column:after_deduction_balance;not null"`
	BeforeBalance          int64     `json:"before_balance"           gorm:"column:before_balance;not null"`
	CreatedAt              time.Time `json:"created_at"               gorm:"column:created_at;autoCreateTime;default:current_timestamp"`
}

func (DebtResumeDeductionBalanceTransaction) TableName() string {
	return "DebtResumeDeductionBalanceTransaction"
}
