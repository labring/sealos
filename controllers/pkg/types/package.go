package types

import (
	"time"

	"github.com/google/uuid"
)

// AIQuotaPackage 对应 ai_quota_package 表的结构体
type WorkspaceAIQuotaPackage struct {
	ID           uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id" bson:"id"`
	Workspace    string    `gorm:"type:varchar(50);not null;index:idx_workspace;column:workspace" json:"workspace" bson:"workspace"`
	RegionDomain string    `gorm:"type:varchar(50);not null;index:idx_region_domain;column:region_domain" json:"region_domain" bson:"region_domain"`
	//PackageType   string           `gorm:"type:varchar(50);not null;check:package_type IN ('FREE','SUBSCRIPTION','PAY_AS_YOU_GO')" json:"package_type" bson:"package_type"`
	Total  int64       `gorm:"type:bigint;not null;default:0" json:"total_quota" bson:"total_quota"`
	Usage  int64       `gorm:"type:bigint;not null;default:0" json:"usage" bson:"usage"`
	From   PackageFrom `gorm:"type:varchar(50)" json:"from" bson:"from"`
	FromID string      `gorm:"type:varchar(50)" json:"from_id" bson:"from_id"`
	//RemainingQuota float64         `gorm:"type:decimal(15,2);generated:total_quota - usage" json:"remaining_quota" bson:"remaining_quota"`
	Status                  PackageStatus `gorm:"type:varchar(20);not null;default:'active'" json:"status" bson:"status"`
	WorkspaceSubscriptionID uuid.UUID     `gorm:"type:uuid" json:"workspace_subscription_id" bson:"workspace_subscription_id"`
	CreatedAt               time.Time     `gorm:"type:timestamp(3) with time zone;not null;default:current_timestamp" json:"created_at" bson:"created_at"`
	UpdatedAt               time.Time     `gorm:"type:timestamp(3) with time zone;not null;default:current_timestamp;autoUpdateTime" json:"updated_at" bson:"updated_at"`
	ExpiredAt               time.Time     `gorm:"type:timestamp(3) with time zone;not null;default:current_timestamp" json:"expired_at" bson:"expired_at"`
}

func (WorkspaceAIQuotaPackage) TableName() string {
	return "WorkspaceAIQuotaPackage"
}

// PackageStatus 定义套餐状态
type PackageStatus string

const (
	PackageStatusActive   PackageStatus = "active"
	PackageStatusExpired  PackageStatus = "expired"
	PackageStatusInactive PackageStatus = "inactive"

	PKGFromWorkspaceSubscription = "workspace_subscription"
)
