// Copyright © 2025 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package types

import (
	"time"

	"github.com/google/uuid"
)

// TODO: 加索引
// Credits 表示用户的credits信息
type Credits struct {
	ID         uuid.UUID       `json:"id" gorm:"column:id;type:uuid;default:gen_random_uuid();primary_key"`                                           // credits ID
	UserUID    uuid.UUID       `json:"user_uid" gorm:"column:user_uid;type:uuid"`                                                                     // 用户ID
	Amount     int64           `json:"amount" gorm:"column:amount;type:bigint"`                                                                       // 总额度
	UsedAmount int64           `json:"used_amount" gorm:"column:used_amount;type:bigint"`                                                             // 已使用额度
	FromID     string          `json:"from_id" gorm:"column:from_id;type:text"`                                                                       // 来源ID
	FromType   CreditsFromType `json:"from_type" gorm:"column:from_type;type:text"`                                                                   // 来源分类
	ExpireAt   time.Time       `json:"expire_at" gorm:"column:expire_at;type:timestamp"`                                                              // 过期时间
	CreatedAt  time.Time       `json:"created_at" gorm:"column:created_at;type:timestamp(3) with time zone;default:current_timestamp"`                // 创建时间
	UpdatedAt  time.Time       `json:"updated_at" gorm:"column:updated_at;type:timestamp(3) with time zone;autoUpdateTime;default:current_timestamp"` // 更新时间
	StartAt    time.Time       `json:"start_at" gorm:"column:start_at;type:timestamp"`                                                                // 开始时间
	Status     CreditsStatus   `json:"status" gorm:"column:status;type:text"`                                                                         // 状态
}

type (
	CreditsStatus       string
	CreditsRecordType   string
	CreditsRecordReason string

	CreditsFromType string
)

const (
	CreditsStatusActive  CreditsStatus = "active"
	CreditsStatusExpired CreditsStatus = "expired"
	CreditsStatusUsedUp  CreditsStatus = "used_up"

	CreditsFromTypeSubscription CreditsFromType = "subscription"

	CreditsRecordTypeIssue   CreditsRecordType = "issue"
	CreditsRecordTypeConsume CreditsRecordType = "consume"

	CreditsRecordReasonResourceAccountTransaction CreditsRecordReason = "AccountTransaction"
)

// CreditsTransaction 表示credits的使用或发放记录
type CreditsTransaction struct {
	ID                   uuid.UUID           `json:"id"`                               // 记录ID
	UserUID              uuid.UUID           `json:"user_uid"`                         // 用户ID
	AccountTransactionID *uuid.UUID          `json:"account_transaction_id,omitempty"` // 关联的AccountTransaction ID
	RegionUID            uuid.UUID           `json:"region_uid"`                       // 区域ID
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
