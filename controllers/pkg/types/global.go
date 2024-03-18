// Copyright © 2024 sealos.
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

type Account struct {
	UserUID                 uuid.UUID `gorm:"column:userUid;type:uuid;default:gen_random_uuid();primary_key"`
	ActivityBonus           int64     `gorm:"column:activityBonus;type:bigint;not null"`
	EncryptBalance          string    `gorm:"column:encryptBalance;type:text;not null"`
	EncryptDeductionBalance string    `gorm:"column:encryptDeductionBalance;type:text;not null"`
	CreatedAt               time.Time `gorm:"type:timestamp(3) with time zone;default:current_timestamp();not null"`
	CreateRegionID          string    `gorm:"type:text;not null"`
	Balance                 int64
	DeductionBalance        int64
}

func (Account) TableName() string {
	return "Account"
}

type Region struct {
	UID         uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primary_key"`
	DisplayName string    `gorm:"type:text;not null"`
	Location    string    `gorm:"type:text;not null"`
	Domain      string    `gorm:"type:text;not null"`
	Description string    `gorm:"type:text;not null"`
}

// RegionUserCr is located in the region
type RegionUserCr struct {
	UID       uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primary_key"`
	CrName    string    `gorm:"type:text;column:crName;not null;unique"`
	UserUID   uuid.UUID `gorm:"column:userUid;type:uuid;not null"`
	CreatedAt time.Time `gorm:"type:timestamp(3);default:current_timestamp();not null"`
	UpdatedAt time.Time `gorm:"type:timestamp(3);default:current_timestamp();not null"`
}

type OauthProvider struct {
	UID          uuid.UUID         `gorm:"type:uuid;default:gen_random_uuid();primary_key"`
	UserUID      uuid.UUID         `gorm:"column:userUid;type:uuid;not null"`
	ProviderType OauthProviderType `gorm:"column:providerType;type:text;not null"`
	ProviderID   string            `gorm:"column:providerId;type:text;not null"`
}

type Transfer struct {
	UID         uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primary_key"`
	FromUserUID uuid.UUID `gorm:"column:fromUserUid;type:uuid;not null"`
	ToUserUID   uuid.UUID `gorm:"column:toUserUid;type:uuid;not null"`
	Amount      int64     `gorm:"type:bigint;not null"`
	Remark      string    `gorm:"type:text;not null"`
	CreatedAt   time.Time `gorm:"type:timestamp(3) with time zone;default:current_timestamp();not null"`
}

func (Transfer) TableName() string {
	return "Transfer"
}

type User struct {
	UID       uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primary_key"`
	CreateAt  time.Time `gorm:"type:timestamp(3) with time zone;default:current_timestamp();not null"`
	UpdateAt  time.Time `gorm:"type:timestamp(3) with time zone;default:current_timestamp();not null"`
	AvatarURI string    `gorm:"column:avatarUri;type:text;not null"`
	Nickname  string    `gorm:"type:text;not null"`
	ID        string    `gorm:"type:text;not null;unique"`
	Name      string    `gorm:"type:text;not null"`
}

func (User) TableName() string {
	return "User"
}

type OauthProviderType string

const (
	OauthProviderTypePhone  OauthProviderType = "PHONE"
	OauthProviderTypeGithub OauthProviderType = "GITHUB"
	OauthProviderTypeWechat OauthProviderType = "WECHAT"
)

func (OauthProvider) TableName() string {
	return "OauthProvider"
}

func (Region) TableName() string {
	return "Region"
}

func (RegionUserCr) TableName() string {
	return "UserCr"
}

type TransferAccountV1 struct {
	//RealUser   RealUser
	RegionUID       uuid.UUID `gorm:"column:regionUid;type:uuid;not null"`
	RegionUserOwner string    `gorm:"column:regionUserOwner;type:text;not null"`
	Exist           bool      `gorm:"type:boolean;default:false"`
	Account
}

func (TransferAccountV1) TableName() string {
	return "TransferAccountV1"
}

type NullUserRecord struct {
	CrName   string `gorm:"column:crName;type:text;not null;unique"`
	RegionID string `gorm:"type:text;not null"`
}

func (NullUserRecord) TableName() string {
	return "NullUserRecord"
}

type ErrorAccountCreate struct {
	Account
	UserCr          string    `gorm:"column:userCr;type:text;not null;unique"`
	ErrorTime       time.Time `gorm:"type:timestamp(3) with time zone;default:current_timestamp();not null"`
	RegionUID       uuid.UUID `gorm:"column:regionUid;type:uuid;not null"`
	RegionUserOwner string    `gorm:"column:regionUserOwner;type:text;not null"`
	Message         string    `gorm:"type:text;not null"`
}

func (ErrorAccountCreate) TableName() string {
	return "ErrorAccountCreate"
}

type ErrorPaymentCreate struct {
	PaymentRaw
	CreateTime time.Time `gorm:"type:timestamp(3) with time zone;default:current_timestamp();not null"`
	Message    string    `gorm:"type:text;not null"`
}

type PaymentRaw struct {
	UserUID         uuid.UUID `gorm:"column:userUid;type:uuid;not null"`
	RegionUID       uuid.UUID `gorm:"column:regionUid;type:uuid;not null"`
	CreatedAt       time.Time `gorm:"type:timestamp(3) with time zone;default:current_timestamp();not null"`
	RegionUserOwner string    `gorm:"column:regionUserOwner;type:text;not null"`
	Method          string    `gorm:"type:text;not null"`
	Amount          int64     `gorm:"type:bigint;not null"`
	Gift            int64     `gorm:"type:bigint"`
	TradeNO         string    `gorm:"type:text;unique;not null"`
	// CodeURL is the codeURL of wechatpay
	CodeURL    string `gorm:"type:text"`
	InvoicedAt bool   `gorm:"type:boolean;default:false"`
	Remark     string `gorm:"type:text"`
	Message    string `gorm:"type:text;not null"`
}

func (ErrorPaymentCreate) TableName() string {
	return "ErrorPaymentCreate"
}

type Payment struct {
	ID string `gorm:"type:text;primary_key"`
	PaymentRaw
}

func (Payment) TableName() string {
	return "Payment"
}
