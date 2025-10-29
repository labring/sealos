package types

import (
	"encoding/json"
	"fmt"
	"strings"
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
	UserUID       uuid.UUID              `gorm:"type:uuid;index:idx_workspace_subscription_user_uid;column:user_uid"`  // 用户 ID
	Status        SubscriptionStatus     `gorm:"type:subscription_status;column:status"`                               // 状态
	PayStatus     SubscriptionPayStatus  `gorm:"type:subscription_pay_status;column:pay_status"`                       // 支付状态
	PayMethod     PaymentMethod          `gorm:"type:string;column:pay_method"`                                        // 支付方式
	Stripe        *StripePay             `gorm:"column:stripe;type:json"`                                              // Stripe 相关信息
	TrafficStatus WorkspaceTrafficStatus `gorm:"type:workspace_traffic_status;default:'active';column:traffic_status"` // 流量状态
	// StartAt       time.Time              `gorm:"column:start_at;autoCreateTime"`                                       // 开始时间
	CurrentPeriodStartAt time.Time `gorm:"column:current_period_start_at"`            // 当前周期开始时间
	CurrentPeriodEndAt   time.Time `gorm:"column:current_period_end_at"`              // 当前周期结束时间
	CancelAtPeriodEnd    bool      `gorm:"column:cancel_at_period_end;default:false"` // 是否在当前周期结束时取消订阅

	CancelAt time.Time                 `gorm:"column:cancel_at"`                                 // 取消订阅时间
	CreateAt time.Time                 `gorm:"column:create_at"`                                 // 创建时间
	UpdateAt time.Time                 `gorm:"column:update_at;autoCreateTime"`                  // 更新时间
	ExpireAt *time.Time                `gorm:"column:expire_at"`                                 // 过期时间
	Traffic  []WorkspaceTraffic        `gorm:"foreignKey:WorkspaceSubscriptionID;references:ID"` // 关联的流量数据
	AIQuota  []WorkspaceAIQuotaPackage `gorm:"foreignKey:WorkspaceSubscriptionID;references:ID"` // 关联的AI配额数据
}

// TODO CREATE INDEX IF NOT EXISTS idx_pending_transactions ON "WorkspaceSubscriptionTransaction" (pay_status, start_at, status, region_domain);
type WorkspaceSubscriptionTransaction struct {
	ID            uuid.UUID                     `gorm:"type:uuid;default:gen_random_uuid();primaryKey;column:id"`                         // ID
	From          TransactionFrom               `gorm:"type:varchar(50);column:from;type:text"`                                           // 变更来源, 例如: "user" / "admin" / "referral"
	Workspace     string                        `gorm:"type:varchar(50);not null;index:idx_workspace_region_domain;column:workspace"`     // Workspace 名称
	RegionDomain  string                        `gorm:"type:varchar(50);not null;index:idx_workspace_region_domain;column:region_domain"` // Region Domain
	UserUID       uuid.UUID                     `gorm:"type:uuid;column:user_uid"`                                                        // 用户 ID
	OldPlanName   string                        `gorm:"type:varchar(50);column:old_plan_name"`                                            // 旧的订阅计划名称
	NewPlanName   string                        `gorm:"type:varchar(50);column:new_plan_name"`                                            // 新的订阅计划名称
	OldPlanStatus SubscriptionStatus            `gorm:"type:subscription_status;column:old_plan_status"`                                  // 旧的订阅状态
	Operator      SubscriptionOperator          `gorm:"type:subscription_operator;column:operator"`                                       // 操作类型(created/upgraded/downgraded/canceled/renewed/pay_status_changed)
	StartAt       time.Time                     `gorm:"column:start_at"`                                                                  // 变更开始时间
	CreatedAt     time.Time                     `gorm:"column:created_at;autoCreateTime"`                                                 // 创建时间
	UpdatedAt     time.Time                     `gorm:"column:updated_at;autoUpdateTime"`                                                 // 更新时间
	Status        SubscriptionTransactionStatus `gorm:"type:subscription_transaction_status;column:status"`                               // 状态
	StatusDesc    string                        `gorm:"type:varchar(255);column:status_desc"`                                             // 状态描述
	PayStatus     SubscriptionPayStatus         `gorm:"type:subscription_pay_status;column:pay_status"`                                   // 支付状态
	PayID         string                        `gorm:"type:text;column:pay_id"`                                                          // 支付订单号
	Period        SubscriptionPeriod            `gorm:"type:text;column:period"`                                                          // 周期, 默认1一个月，年或者月
	Amount        int64                         `gorm:"type:bigint;column:amount"`                                                        // 金额
}

type WorkspaceSubscriptionPlan struct {
	ID                uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey;column:id" json:"id"` // 计划 ID
	Name              string         `gorm:"unique;not null;column:name;type:text" json:"name"`                    // 计划名称
	Description       string         `gorm:"type:text;column:description" json:"description"`                             // 描述
	UpgradePlanList   pq.StringArray `gorm:"type:text[];column:upgrade_plan_list" json:"upgrade_plan_list"`                     // 可升级的计划列表
	DowngradePlanList pq.StringArray `gorm:"type:text[];column:downgrade_plan_list" json:"downgrade_plan_list"`                   // 可降级的计划列表
	MaxSeats          int            `gorm:"not null;column:max_seats" json:"max_seats"`                                // 最大席位数
	MaxResources      string         `gorm:"column:max_resources" json:"max_resources"`                                     // 最大资源数: map[string]string: {"cpu": "4", "memory": "8Gi", "storage": "100Gi"}
	Traffic           int64          `gorm:"type:bigint;column:traffic" json:"traffic"`                               // 包含流量包大小, 单位: MB
	AIQuota           int64          `gorm:"type:bigint;column:ai_quota" json:"ai_quota"`                              // 包含AI配额大小
	CreatedAt         time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`                         // 创建时间
	UpdatedAt         time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`                         // 更新时间
	Order             int            `gorm:"column:order" json:"order"`                                             // 排序号
	Tags              pq.StringArray `gorm:"type:text[];column:tags" json:"tags"`                                  // 标签分类
	Prices            []ProductPrice `gorm:"foreignKey:ProductID;references:ID" json:"prices"`                       // 一对多关联
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

// Resource represents the JSON structure
type WorkspaceFeatureResource struct {
	CPU       string `json:"cpu"`
	Memory    string `json:"memory"`
	Storage   string `json:"storage"`
	NodePorts string `json:"nodeports,omitempty"`
	Traffic   int64  `json:"traffic,omitempty"`
}

func ParseMaxResource(res string, traffic int64) ([]string, error) {
	var resource WorkspaceFeatureResource
	err := json.Unmarshal([]byte(res), &resource)
	if err != nil {
		return nil, err
	}
	if traffic > 0 {
		resource.Traffic = traffic
	}
	return parseResource(resource)
}

func parseResource(res WorkspaceFeatureResource) ([]string, error) {
	result := []string{
		res.CPU + " vCPU",
		strings.TrimSuffix(res.Memory, "Gi") + "GB RAM",
		strings.TrimSuffix(res.Storage, "Gi") + "GB Disk",
		res.NodePorts + " / NodePorts",
	}

	// Handle nodeports (traffic) if present
	if res.Traffic != 0 {
		if res.Traffic > 1024 {
			trafficGB := float64(res.Traffic) / 1024.0
			result = append(result, fmt.Sprintf("%.2fGB Traffic", trafficGB))
		} else {
			result = append(result, fmt.Sprintf("%dMB Traffic", res.Traffic))
		}
	}
	return result, nil
}
