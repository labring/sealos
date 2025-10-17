package types

import (
	"fmt"
	"regexp"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
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
	// Most Popular
	MostPopular bool `gorm:"column:most_popular"`
}

type (
	TransactionFrom string
	BillingCycle    string
)

const (
	FreeSubscriptionPlanName = "Free"

	ProductPriceBillingCycleYearly    BillingCycle = "yearly"
	ProductPriceBillingCycleQuarterly BillingCycle = "quarterly"
	ProductPriceBillingCycleMonthly   BillingCycle = "monthly"
	ProductPriceBillingCycleWeekly    BillingCycle = "weekly"
	ProductPriceBillingCycleDaily     BillingCycle = "daily"
	ProductPriceBillingCycleOneTime   BillingCycle = "one_time"

	TransactionFromUser     TransactionFrom = "user"
	TransactionFromAdmin    TransactionFrom = "admin"
	TransactionFromSystem   TransactionFrom = "system"
	TransactionFromReferral TransactionFrom = "referral"
)

func DayPeriod(days int) SubscriptionPeriod {
	return SubscriptionPeriod(strconv.Itoa(days) + "d")
}

func WeekPeriod(weeks int) SubscriptionPeriod {
	return SubscriptionPeriod(strconv.Itoa(weeks) + "w")
}

func MonthPeriod(months int) SubscriptionPeriod {
	return SubscriptionPeriod(strconv.Itoa(months) + "m")
}

func ParsePeriod(period SubscriptionPeriod) (time.Duration, error) {
	re := regexp.MustCompile(`^(\d+)([dhwmy])$`)
	matches := re.FindStringSubmatch(string(period))
	if len(matches) != 3 {
		return 0, fmt.Errorf("invalid duration format: %s", period)
	}
	value, err := strconv.Atoi(matches[1])
	if err != nil {
		return 0, fmt.Errorf("invalid number in duration: %s", matches[1])
	}
	unit := matches[2]
	switch unit {
	case "h":
		return time.Duration(value) * time.Hour, nil
	case "d":
		return time.Duration(value) * 24 * time.Hour, nil
	case "w":
		return time.Duration(value) * 7 * 24 * time.Hour, nil
	case "m":
		return time.Duration(value) * 30 * 24 * time.Hour, nil
	case "y":
		return time.Duration(value) * 365 * 24 * time.Hour, nil
	default:
		return 0, fmt.Errorf("unsupported unit: %s", unit)
	}
}

type ProductPrice struct {
	ID            uuid.UUID          `gorm:"type:uuid;default:gen_random_uuid();primaryKey;column:id"`
	ProductID     uuid.UUID          `gorm:"type:uuid;not null;index:idx_product_cycle,unique"`
	BillingCycle  SubscriptionPeriod `gorm:"type:varchar(20);not null;index:idx_product_cycle,unique"` // 计费周期, 年/季/月/周/天/次
	Price         int64              `gorm:"type:bigint;column:price"`                                 // 价格
	OriginalPrice int64              `gorm:"type:bigint;column:original_price"`
	StripePrice   *string            `gorm:"type:varchar(100);column:stripe_price"` // Stripe 价格 ID
	// Currency  string    `gorm:"type:varchar(10);not null;column:currency"`  // 货币
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime"` // 创建时间
	UpdatedAt time.Time `gorm:"column:updated_at;autoUpdateTime"` // 更新时间
}

func (p SubscriptionPlan) GetName() string {
	return p.Name
}

func (p SubscriptionPlan) GetMaxResources() string {
	return p.MaxResources
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

func (ProductPrice) TableName() string {
	return "ProductPrice"
}

type AccountRegionUserTask struct {
	ID uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey;column:id"` // ID
	// RegionUID uuid.UUID `gorm:"type:uuid;not null;index;column:region_uid"`               // Region ID
	RegionDomain string    `gorm:"type:varchar(50);not null;column:region_domain"` // Region Domain
	UserUID      uuid.UUID `gorm:"type:uuid;not null;index;column:user_uid"`       // 用户 ID
	CreatedAt    time.Time `gorm:"column:created_at;autoCreateTime"`               // 创建时间
	// flush-quota
	Type AccountRegionUserTaskType `gorm:"column:type"` // 类型
	// TaskID    uuid.UUID                 `gorm:"type:uuid;column:task_id"`                                 // 任务 ID
	// Executed bool      `gorm:"column:executed"` // 是否已执行
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
