package types

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

const DebtNamespaceAnnoStatusKey = "debt.sealos/status"

type WorkspaceSubscription struct {
	ID            uuid.UUID              `gorm:"type:uuid;default:gen_random_uuid();primaryKey;column:id"` // 订阅 ID
	PlanName      string                 `gorm:"type:varchar(50);column:plan_name"`                        // 计划名称
	Workspace     string                 `gorm:"type:varchar(50);column:workspace;uniqueIndex:idx_workspace_region_domain"`
	RegionDomain  string                 `gorm:"type:varchar(50);column:region_domain;uniqueIndex:idx_workspace_region_domain"`
	UserUID       uuid.UUID              `gorm:"unique;not null;type:uuid;column:user_uid"`           // 付费的用户 ID
	Status        SubscriptionStatus     `gorm:"type:subscription_status;column:status"`              // 状态
	TrafficStatus WorkspaceTrafficStatus `gorm:"type:workspace_traffic_status;column:traffic_status"` // 流量状态
	StartAt       time.Time              `gorm:"column:start_at;autoCreateTime"`                      // 开始时间
	UpdateAt      time.Time              `gorm:"column:update_at;autoCreateTime"`                     // 更新时间
	ExpireAt      time.Time              `gorm:"column:expire_at;autoCreateTime"`                     // 过期时间
	// CardID       *uuid.UUID         `gorm:"type:uuid;column:card_id"`                         // 银行卡 ID
	Traffic []WorkspaceTraffic `gorm:"foreignKey:ID;references:WorkspaceSubscriptionID"` // 关联的流量数据
}

// TODO CREATE INDEX IF NOT EXISTS idx_pending_transactions ON "WorkspaceSubscriptionTransaction" (pay_status, start_at, status, region_domain);
type WorkspaceSubscriptionTransaction struct {
	ID            uuid.UUID                     `gorm:"type:uuid;default:gen_random_uuid();primaryKey;column:id"`                               // ID
	From          TransactionFrom               `gorm:"type:varchar(50);column:from;type:text"`                                                 // 变更来源, 例如: "user" / "admin" / "referral"
	Workspace     string                        `gorm:"type:varchar(50);not null;uniqueIndex:idx_workspace_region_domain;column:workspace"`     // Workspace 名称
	RegionDomain  string                        `gorm:"type:varchar(50);not null;uniqueIndex:idx_workspace_region_domain;column:region_domain"` // Region Domain
	OldPlanName   string                        `gorm:"type:varchar(50);column:old_plan_name"`                                                  // 旧的订阅计划名称
	NewPlanName   string                        `gorm:"type:varchar(50);column:new_plan_name"`                                                  // 新的订阅计划名称
	OldPlanStatus SubscriptionStatus            `gorm:"type:subscription_status;column:old_plan_status"`                                        // 旧的订阅状态
	Operator      SubscriptionOperator          `gorm:"type:subscription_operator;column:operator"`                                             // 操作类型(created/upgraded/downgraded/canceled/renewed)
	StartAt       time.Time                     `gorm:"column:start_at"`                                                                        // 变更开始时间
	CreatedAt     time.Time                     `gorm:"column:created_at;autoCreateTime"`                                                       // 创建时间
	UpdatedAt     time.Time                     `gorm:"column:updated_at;autoUpdateTime"`                                                       // 更新时间
	Status        SubscriptionTransactionStatus `gorm:"type:subscription_status;column:status"`                                                 // 状态
	StatusDesc    string                        `gorm:"type:varchar(255);column:status_desc"`                                                   // 状态描述
	PayStatus     SubscriptionPayStatus         `gorm:"type:subscription_pay_status;column:pay_status"`                                         // 支付状态
	PayID         string                        `gorm:"type:text;column:pay_id"`                                                                // 支付订单号
	Period        SubscriptionPeriod            `gorm:"type:subscription_period;column:period"`                                                 // 周期, 默认1一个月，年或者月
	Amount        int64                         `gorm:"type:bigint;column:amount"`                                                              // 金额
}

type WorkspaceSubscriptionPlan struct {
	ID                uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey;column:id"` // 计划 ID
	Name              string         `gorm:"unique;not null;column:name;type:text"`                    // 计划名称
	Description       string         `gorm:"type:text;column:description"`                             // 描述
	UpgradePlanList   pq.StringArray `gorm:"type:text[];column:upgrade_plan_list"`                     // 可升级的计划列表
	DowngradePlanList pq.StringArray `gorm:"type:text[];column:downgrade_plan_list"`                   // 可降级的计划列表
	MaxSeats          int            `gorm:"not null;column:max_seats"`                                // 最大席位数
	MaxWorkspaces     int            `gorm:"not null;column:max_workspaces"`                           // 最大 Workspace 数量
	MaxResources      string         `gorm:"column:max_resources"`                                     // 最大资源数: map[string]string: {"cpu": "4", "memory": "8Gi", "storage": "100Gi"}
	Traffic           int64          `gorm:"type:bigint;column:traffic"`                               // 包含流量包大小, 单位: MB
	CreatedAt         time.Time      `gorm:"column:created_at;autoCreateTime"`                         // 创建时间
	UpdatedAt         time.Time      `gorm:"column:updated_at;autoUpdateTime"`                         // 更新时间
	Prices            []ProductPrice `gorm:"foreignKey:ID;references:ProductID"`                       // 一对多关联
}

func (p WorkspaceSubscriptionPlan) GetName() string {
	return p.Name
}
func (p WorkspaceSubscriptionPlan) GetMaxResources() string {
	return p.MaxResources
}

func (WorkspaceSubscription) TableName() string {
	return "WorkspaceSubscription"
}

func (WorkspaceSubscriptionTransaction) TableName() string {
	return "WorkspaceSubscriptionTransaction"
}

func (WorkspaceSubscriptionPlan) TableName() string {
	return "WorkspaceSubscriptionPlan"
}
