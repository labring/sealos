package types

import (
	"time"

	"github.com/lib/pq"

	"github.com/google/uuid"
)

type Subscription struct {
	ID            uuid.UUID          `gorm:"type:uuid;default:gen_random_uuid();primaryKey;column:id"` // 订阅 ID
	PlanID        uuid.UUID          `gorm:"type:uuid;column:plan_id"`                                 // 计划 ID
	PlanName      string             `gorm:"type:varchar(50);column:plan_name"`                        // 计划名称
	UserUID       uuid.UUID          `gorm:"unique;not null;type:uuid;column:user_uid"`                // 用户 ID
	Status        SubscriptionStatus `gorm:"type:varchar(50);column:status"`                           // 状态
	StartAt       time.Time          `gorm:"column:start_at;autoCreateTime"`                           // 开始时间
	UpdateAt      time.Time          `gorm:"column:update_at;autoCreateTime"`                          // 更新时间
	ExpireAt      time.Time          `gorm:"column:expire_at;autoCreateTime"`                          // 过期时间
	CardID        *uuid.UUID         `gorm:"type:uuid;column:card_id"`                                 // 银行卡 ID
	NextCycleDate time.Time          `gorm:"column:next_cycle_date"`                                   // 下一个周期的日期
}

type SubscriptionStatus string

const (
	SubscriptionStatusNormal   SubscriptionStatus = "NORMAL"
	SubscriptionStatusDebt     SubscriptionStatus = "DEBT"
	SubscriptionStatusLockUser SubscriptionStatus = "LOCK_USER"
)

// 订阅变更记录表
type SubscriptionTransaction struct {
	ID             uuid.UUID                     `gorm:"type:uuid;default:gen_random_uuid();primaryKey;column:id"` // ID
	SubscriptionID uuid.UUID                     `gorm:"type:uuid;not null;index;column:subscription_id"`          // 关联的订阅 ID
	UserUID        uuid.UUID                     `gorm:"type:uuid;not null;index;column:user_uid"`                 // 用户 ID
	OldPlanID      uuid.UUID                     `gorm:"type:uuid;column:old_plan_id"`                             // 旧的订阅计划 ID
	NewPlanID      uuid.UUID                     `gorm:"type:uuid;column:new_plan_id"`                             // 新的订阅计划 ID
	OldPlanName    string                        `gorm:"type:varchar(50);column:old_plan_name"`                    // 旧的订阅计划名称
	NewPlanName    string                        `gorm:"type:varchar(50);column:new_plan_name"`                    // 新的订阅计划名称
	OldPlanStatus  SubscriptionStatus            `gorm:"type:varchar(50);column:old_plan_status"`                  // 旧的订阅状态
	Operator       SubscriptionOperator          `gorm:"type:varchar(50);column:operator"`                         // 操作类型(created/upgraded/downgraded/canceled/renewed)
	StartAt        time.Time                     `gorm:"column:start_at"`                                          // 变更开始时间
	CreatedAt      time.Time                     `gorm:"column:created_at;autoCreateTime"`                         // 创建时间
	UpdatedAt      time.Time                     `gorm:"column:updated_at;autoUpdateTime"`                         // 更新时间
	Status         SubscriptionTransactionStatus `gorm:"type:varchar(50);column:status"`                           // 状态
	PayStatus      SubscriptionPayStatus         `gorm:"type:varchar(50);column:pay_status"`                       // 支付状态
	PayID          string                        `gorm:"type:text;column:pay_id"`                                  // 支付订单号
	Amount         int64                         `gorm:"type:bigint;column:amount"`                                // 金额
}

type SubscriptionTransactionStatus string

type SubscriptionOperator string

type SubscriptionPayStatus string

const (
	SubscriptionTransactionTypeCreated    SubscriptionOperator = "created"
	SubscriptionTransactionTypeUpgraded   SubscriptionOperator = "upgraded"
	SubscriptionTransactionTypeDowngraded SubscriptionOperator = "downgraded"
	SubscriptionTransactionTypeCanceled   SubscriptionOperator = "canceled"
	SubscriptionTransactionTypeRenewed    SubscriptionOperator = "renewed"

	SubscriptionTransactionStatusCompleted  SubscriptionTransactionStatus = "completed"
	SubscriptionTransactionStatusPending    SubscriptionTransactionStatus = "pending"
	SubscriptionTransactionStatusProcessing SubscriptionTransactionStatus = "processing"
	SubscriptionTransactionStatusFailed     SubscriptionTransactionStatus = "failed"

	SubscriptionPayStatusPending SubscriptionPayStatus = "pending"
	SubscriptionPayStatusPaid    SubscriptionPayStatus = "paid"
	SubscriptionPayStatusNoNeed  SubscriptionPayStatus = "no_need"
	SubscriptionPayStatusFailed  SubscriptionPayStatus = "failed"
)

const (
	FreeSubscriptionPlanName = "Free"
)

type SubscriptionPlan struct {
	ID                uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey;column:id"` // 计划 ID
	Name              string         `gorm:"unique;not null;column:name;type:text"`                    // 计划名称
	Description       string         `gorm:"type:text;column:description"`                             // 描述
	Amount            int64          `gorm:"type:bigint;column:amount"`                                // 金额
	GiftAmount        int64          `gorm:"type:bigint;column:gift_amount"`                           // 赠送金额
	Period            string         `gorm:"type:varchar(50);column:period"`                           // 周期
	UpgradePlanList   pq.StringArray `gorm:"type:text[];column:upgrade_plan_list"`                     // 可升级的计划列表
	DowngradePlanList pq.StringArray `gorm:"type:text[];column:downgrade_plan_list"`                   // 可降级的计划列表
	// <0 Unrestricted
	MaxSeats      int       `gorm:"not null;column:max_seats"`        // 最大席位数
	MaxWorkspaces int       `gorm:"not null;column:max_workspaces"`   // 最大 Workspace 数量
	MaxResources  string    `gorm:"column:max_resources"`             // 最大资源数: map[string]string: {"cpu": "4", "memory": "8Gi", "storage": "100Gi"}
	CreatedAt     time.Time `gorm:"column:created_at;autoCreateTime"` // 创建时间
	UpdatedAt     time.Time `gorm:"column:updated_at;autoUpdateTime"` // 更新时间
	//Most Popular
	MostPopular bool `gorm:"column:most_popular"`
}

func (Subscription) TableName() string {
	return "Subscription"
}

func (SubscriptionPlan) TableName() string {
	return "SubscriptionPlan"
}

func (SubscriptionTransaction) TableName() string {
	return "SubscriptionTransaction"
}

type AccountRegionUserTask struct {
	ID uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey;column:id"` // ID
	//RegionUID uuid.UUID `gorm:"type:uuid;not null;index;column:region_uid"`               // Region ID
	RegionDomain string    `gorm:"type:varchar(50);not null;column:region_domain"` // Region Domain
	UserUID      uuid.UUID `gorm:"type:uuid;not null;index;column:user_uid"`       // 用户 ID
	CreatedAt    time.Time `gorm:"column:created_at;autoCreateTime"`               // 创建时间
	// flush-quota
	Type AccountRegionUserTaskType `gorm:"column:type"` // 类型
	//TaskID    uuid.UUID                 `gorm:"type:uuid;column:task_id"`                                 // 任务 ID
	//Executed bool      `gorm:"column:executed"` // 是否已执行
	StartAt time.Time `gorm:"column:start_at"` // 开始时间
	EndAt   time.Time `gorm:"column:end_at"`   // 结束时间
	Status  AccountRegionUserTaskStatus
}

func (AccountRegionUserTask) TableName() string {
	return "AccountRegionUserTask"
}

type AccountRegionUserTaskType string

type AccountRegionUserTaskStatus string

const (
	AccountRegionUserTaskTypeFlushQuota AccountRegionUserTaskType = "flush-quota"
	AccountRegionUserTaskTypeFlushDebt  AccountRegionUserTaskType = "flush-debt"

	AccountRegionUserTaskStatusPending   AccountRegionUserTaskStatus = "pending"
	AccountRegionUserTaskStatusCompleted AccountRegionUserTaskStatus = "completed"
	AccountRegionUserTaskStatusFailed    AccountRegionUserTaskStatus = "failed"
)

type UserKYC struct {
	UserUID   uuid.UUID `gorm:"type:uuid;not null;primaryKey;column:user_uid"` // 用户 ID
	Status    KYCStatus `gorm:"type:varchar(50);column:status"`                // KYC 状态
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime"`              // 创建时间
	UpdatedAt time.Time `gorm:"column:updated_at;autoUpdateTime"`              // 更新时间
	NextAt    time.Time `gorm:"column:next_at"`                                // 下次credits时间
}

func (UserKYC) TableName() string {
	return "UserKYC"
}

type KYCStatus string

const (
	UserKYCStatusPending   KYCStatus = "pending"
	UserKYCStatusCompleted KYCStatus = "completed"
	UserKYCStatusFailed    KYCStatus = "failed"
)
