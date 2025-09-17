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
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/lib/pq"

	"github.com/google/uuid"
)

type Account struct {
	UserUID       uuid.UUID `gorm:"column:userUid;type:uuid;default:gen_random_uuid();primary_key"`
	ActivityBonus int64     `gorm:"column:activityBonus;type:bigint;not null"`
	// Discard EncryptBalance and EncryptDeductionBalance
	EncryptBalance          string    `gorm:"column:encryptBalance;type:text"`
	EncryptDeductionBalance string    `gorm:"column:encryptDeductionBalance;type:text"`
	CreatedAt               time.Time `gorm:"type:timestamp(3) with time zone;default:current_timestamp"`
	UpdatedAt               time.Time `gorm:"type:timestamp(3) with time zone;autoUpdateTime;default:current_timestamp"`
	CreateRegionID          string    `gorm:"type:text;not null"`
	Balance                 int64
	DeductionBalance        int64
}

func (Account) TableName() string {
	return "Account"
}

type UsableBalanceWithCredits struct {
	UserUID          uuid.UUID
	Balance          int64 // Separate balance
	DeductionBalance int64 // Separate deduction balance
	UsableCredits    int64
	CreateRegionID   string
}

type BalanceWithCredits struct {
	UserUID          uuid.UUID `json:"userUid"`
	Balance          int64     `json:"balance"`
	DeductionBalance int64     `json:"deductionBalance"`
	Credits          int64     `json:"credits"`
	DeductionCredits int64     `json:"deductionCredits"`
	CreateRegionID   string    `json:"createRegionId"`
}

type Region struct {
	UID         uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primary_key"`
	DisplayName string    `gorm:"column:displayName;type:text"`
	Location    string    `gorm:"column:location;type:text"`
	Domain      string    `gorm:"column:domain;type:text;not null;unique"`
	Description string    `gorm:"column:description;type:text"`
}

type RegionDescription struct {
	Provider    string            `json:"provider"`
	Serial      string            `json:"serial"`
	Description map[string]string `json:"description"`
}

func RegionDescriptionJSON(data RegionDescription) string {
	jsonString := `{
		"provider": "` + data.Provider + `",
		"serial": "` + data.Serial + `",
		"description": {`

	for key, value := range data.Description {
		jsonString += `"` + key + `": "` + value + `",`
	}

	jsonString = jsonString[:len(jsonString)-1]

	jsonString += `}
	}`

	return jsonString
}

// RegionUserCr is located in the region
type RegionUserCr struct {
	UID       uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primary_key"`
	CrName    string    `gorm:"type:text;column:crName;not null;unique"`
	UserUID   uuid.UUID `gorm:"column:userUid;type:uuid;not null"`
	CreatedAt time.Time `gorm:"column:createdAt;type:timestamp(3);default:current_timestamp"`
	UpdatedAt time.Time `gorm:"column:updatedAt;type:timestamp(3);default:current_timestamp"`
}

type OauthProvider struct {
	UID          uuid.UUID         `gorm:"type:uuid;default:gen_random_uuid();primary_key"`
	UserUID      uuid.UUID         `gorm:"column:userUid;type:uuid;not null"`
	ProviderType OauthProviderType `gorm:"column:providerType;type:text;not null"`
	ProviderID   string            `gorm:"column:providerId;type:text;not null"`
	CreatedAt    time.Time         `gorm:"column:createdAt;type:timestamp(3);default:current_timestamp"`
	UpdatedAt    time.Time         `gorm:"column:updatedAt;type:timestamp(3);default:current_timestamp"`
	Password     string            `gorm:"type:text"`
}

type Transfer struct {
	ID          string    `gorm:"type:text;primary_key"`
	UID         uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primary_key"`
	FromUserUID uuid.UUID `gorm:"column:fromUserUid;type:uuid;not null"`
	FromUserID  string    `gorm:"column:fromUserId;type:text;not null"`
	ToUserUID   uuid.UUID `gorm:"column:toUserUid;type:uuid;not null"`
	ToUserID    string    `gorm:"column:toUserId;type:text;not null"`
	Amount      int64     `gorm:"type:bigint;not null"`
	Remark      string    `gorm:"type:text;not null"`
	CreatedAt   time.Time `gorm:"type:timestamp(3) with time zone;default:current_timestamp"`
}

func (Transfer) TableName() string {
	return "UserTransfer"
}

type User struct {
	UID       uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primary_key"`
	CreatedAt time.Time  `gorm:"column:createdAt;type:timestamp(3) with time zone;default:current_timestamp"`
	UpdatedAt time.Time  `gorm:"column:updatedAt;type:timestamp(3) with time zone;default:current_timestamp"`
	AvatarURI string     `gorm:"column:avatarUri;type:text"`
	Nickname  string     `gorm:"type:text"`
	ID        string     `gorm:"type:text;not null;unique"`
	Name      string     `gorm:"type:text;not null"`
	Status    UserStatus `gorm:"column:status;type:UserStatus;default:'NORMAL_USER'::defaultdb.public.'UserStatus';not null"`
}

type UserStatus string

const (
	UserStatusNormal UserStatus = "NORMAL_USER"
	UserStatusLock   UserStatus = "LOCK_USER"
)

func (User) TableName() string {
	return "User"
}

type Workspace struct {
	UID         uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primary_key"`
	ID          string    `gorm:"type:text;not null;unique"`
	DisplayName string    `gorm:"column:displayName;type:text;not null"`
	CreatedAt   time.Time `gorm:"column:createdAt;type:timestamp(3) with time zone;default:current_timestamp"`
	UpdatedAt   time.Time `gorm:"column:updatedAt;type:timestamp(3) with time zone;default:current_timestamp"`
}

type UserWorkspace struct {
	UID          uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primary_key"`
	CreatedAt    time.Time `gorm:"column:createdAt;type:timestamp(3) with time zone;default:current_timestamp"`
	UpdatedAt    time.Time `gorm:"column:updatedAt;type:timestamp(3) with time zone;default:current_timestamp"`
	WorkspaceUID uuid.UUID `gorm:"column:workspaceUid;type:uuid;not null"`
	UserCrUID    uuid.UUID `gorm:"column:userCrUid;type:uuid;not null"`
	HandlerUID   uuid.UUID `gorm:"column:handlerUid;type:uuid"`
	Role         Role      `gorm:"type:Role;default:'DEVELOPER'::defaultdb.public.'Role';not null"`
	Status       JoinStatus
	IsPrivate    bool      `gorm:"column:isPrivate;type:boolean;not null"`
	JoinAt       time.Time `gorm:"column:joinAt;type:timestamp(3) with time zone"`
}

type (
	Role              string
	JoinStatus        string
	OauthProviderType string
)

const (
	OauthProviderTypePhone    OauthProviderType = "PHONE"
	OauthProviderTypeEmail    OauthProviderType = "EMAIL"
	OauthProviderTypePassword OauthProviderType = "PASSWORD"
	OauthProviderTypeGithub   OauthProviderType = "GITHUB"
	//OauthProviderTypeWechat   OauthProviderType = "WECHAT"

	RoleOwner Role = "OWNER"
	//RoleDeveloper Role = "DEVELOPER"
	//RoleManager   Role = "MANAGER"

	JoinStatusInWorkspace JoinStatus = "IN_WORKSPACE"
)

func (UserWorkspace) TableName() string {
	return "UserWorkspace"
}

func (Workspace) TableName() string {
	return "Workspace"
}

func (OauthProvider) TableName() string {
	return "OauthProvider"
}

func (Region) TableName() string {
	return "Region"
}

func (RegionUserCr) TableName() string {
	return "UserCr"
}

type InvoiceStatus string

const (
	PendingInvoiceStatus    = "PENDING"
	ProcessingInvoiceStatus = "PROCESSING"
	CompletedInvoiceStatus  = "COMPLETED"
	RejectedInvoiceStatus   = "REJECTED"
)

type Invoice struct {
	ID          string    `gorm:"type:text;primary_key" json:"id" bson:"id"`
	UserID      string    `gorm:"type:text;not null" json:"userID" bson:"userID"`
	CreatedAt   time.Time `gorm:"type:timestamp(3) with time zone;default:current_timestamp" bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"type:timestamp(3) with time zone;default:current_timestamp" bson:"updatedAt" json:"updatedAt"`
	Detail      string    `gorm:"type:text;not null" json:"detail" bson:"detail"`
	Remark      string    `gorm:"type:text" json:"remark" bson:"remark"`
	TotalAmount int64     `gorm:"type:bigint;not null" json:"totalAmount" bson:"totalAmount"`
	// Pending, Completed, Rejected
	Status InvoiceStatus `gorm:"type:text;not null" json:"status" bson:"status"`
}

type InvoicePayment struct {
	InvoiceID string `gorm:"type:text"`
	PaymentID string `gorm:"type:text;primary_key"`
	Amount    int64  `gorm:"type:bigint;not null"`
}

func (Invoice) TableName() string {
	return "Invoice"
}

func (InvoicePayment) TableName() string {
	return "InvoicePayment"
}

type GiftCode struct {
	ID           uuid.UUID `gorm:"column:id;type:uuid;default:gen_random_uuid();primary_key"`
	Code         string    `gorm:"column:code;type:text;not null;unique"`
	CreditAmount int64     `gorm:"column:creditAmount;type:bigint;default:0;not null"`
	Used         bool      `gorm:"column:used;type:boolean;default:false;not null"`
	UsedBy       uuid.UUID `gorm:"column:usedBy;type:uuid"`
	UsedAt       time.Time `gorm:"column:usedAt;type:timestamp(3) with time zone"`
	CreatedAt    time.Time `gorm:"column:createdAt;type:timestamp(3) with time zone;default:current_timestamp"`
	ExpiredAt    time.Time `gorm:"column:expiredAt;type:timestamp(3) with time zone"`
	Comment      string    `gorm:"column:comment;type:text"`
}

func (GiftCode) TableName() string {
	return "GiftCode"
}

type AccountTransaction struct {
	ID                     uuid.UUID      `gorm:"column:id;type:uuid;default:gen_random_uuid();primary_key"`
	RegionUID              uuid.UUID      `gorm:"column:region;type:uuid;"`
	Type                   string         `gorm:"column:type;type:text"`
	UserUID                uuid.UUID      `gorm:"column:userUid;type:uuid"`
	DeductionBalance       int64          `gorm:"column:deduction_balance;type:bigint"`
	Balance                int64          `gorm:"column:balance;type:bigint"`
	DeductionCredit        int64          `gorm:"column:deduction_credit;type:bigint"`
	Message                *string        `gorm:"column:message;type:text"`
	CreatedAt              time.Time      `gorm:"column:created_at;type:timestamp(3) with time zone;default:current_timestamp"`
	UpdatedAt              time.Time      `gorm:"column:updated_at;type:timestamp(3) with time zone;default:current_timestamp"`
	BillingID              uuid.UUID      `gorm:"column:billing_id;type:uuid"`
	BillingIDList          pq.StringArray `gorm:"column:billing_id_list;type:text[]"`
	CreditIDList           pq.StringArray `gorm:"column:credit_id_list;type:text[]"`
	BalanceBefore          int64          `gorm:"column:balance_before;type:bigint"`
	DeductionBalanceBefore int64          `gorm:"column:deduction_balance_before;type:bigint"`
}

func (AccountTransaction) TableName() string {
	return "AccountTransaction"
}

type UserRealNameInfo struct {
	ID                  uuid.UUID       `gorm:"column:id;type:uuid;default:gen_random_uuid();primary_key"`
	UserUID             uuid.UUID       `gorm:"column:userUid;type:uuid;unique"`
	RealName            *string         `gorm:"column:realName;type:text"`
	IDCard              *string         `gorm:"column:idCard;type:text"`
	Phone               *string         `gorm:"column:phone;type:text"`
	IsVerified          bool            `gorm:"column:isVerified;type:boolean;default:false"`
	IDVerifyFailedTimes int             `gorm:"column:idVerifyFailedTimes;type:integer;default:0"`
	CreatedAt           time.Time       `gorm:"column:createdAt;type:timestamp(3) with time zone;default:current_timestamp"`
	UpdatedAt           time.Time       `gorm:"column:updatedAt;type:timestamp(3) with time zone;autoUpdateTime"`
	AdditionalInfo      json.RawMessage `gorm:"column:additionalInfo;type:jsonb"`
}

func (UserRealNameInfo) TableName() string {
	return "UserRealNameInfo"
}

type EnterpriseRealNameInfo struct {
	ID                       uuid.UUID       `gorm:"column:id;type:uuid;default:gen_random_uuid();primary_key"`
	UserUID                  uuid.UUID       `gorm:"column:userUid;type:uuid;unique"`
	EnterpriseName           *string         `gorm:"column:enterpriseName;type:text"`
	EnterpriseQualification  *string         `gorm:"column:enterpriseQualification;type:text"`
	LegalRepresentativePhone *string         `gorm:"column:legalRepresentativePhone;type:text"`
	IsVerified               bool            `gorm:"column:isVerified;type:boolean;default:false"`
	VerificationStatus       *string         `gorm:"column:verificationStatus;type:text"`
	CreatedAt                time.Time       `gorm:"column:createdAt;type:timestamp(3) with time zone;default:current_timestamp"`
	UpdatedAt                time.Time       `gorm:"column:updatedAt;type:timestamp(3) with time zone;autoUpdateTime"`
	AdditionalInfo           json.RawMessage `gorm:"column:additionalInfo;type:jsonb"`
	SupportingMaterials      json.RawMessage `gorm:"column:supportingMaterials;type:jsonb"`
}

func (EnterpriseRealNameInfo) TableName() string {
	return "EnterpriseRealNameInfo"
}

type UserInfo struct {
	ID        uuid.UUID       `gorm:"column:id;type:uuid;default:gen_random_uuid();primary_key"`
	UserUID   uuid.UUID       `gorm:"column:userUid;type:uuid;unique"`
	FirstName string          `gorm:"column:firstname;type:text;default:''::STRING"`
	LastName  string          `gorm:"column:lastname;type:text;default:''::STRING"`
	Config    *UserInfoConfig `gorm:"column:config;type:jsonb"`
	//Config datatypes.JSO `gorm:"column:config;type:jsonb" json:"config"`
}

func (UserInfo) TableName() string {
	return "UserInfo"
}

func (j *UserInfoConfig) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	b, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("failed to unmarshal JSONB: %v", value)
	}
	return json.Unmarshal(b, j)
}

func (j *UserInfoConfig) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	b, err := json.Marshal(j)
	if err != nil {
		return nil, err
	}
	return string(b), nil
}

type UserInfoConfig struct {
	Github Github `json:"github"`
}

type Github struct {
	CreatedAt string      `json:"created_at"`
	Login     string      `json:"login"`
	Name      interface{} `json:"name"`
	ID        int         `json:"id"`
	//AvatarURL               string      `json:"avatar_url"`
	//Bio                     interface{} `json:"bio"`
	//Blog                    string      `json:"blog"`
	//Collaborators           int         `json:"collaborators"`
	//Company                 interface{} `json:"company"`
	//DiskUsage               int         `json:"disk_usage"`
	//Email                   interface{} `json:"email"`
	//EventsURL               string      `json:"events_url"`
	//Followers               int         `json:"followers"`
	//FollowersURL            string      `json:"followers_url"`
	//Following               int         `json:"following"`
	//FollowingURL            string      `json:"following_url"`
	//GistsURL                string      `json:"gists_url"`
	//GravatarID              string      `json:"gravatar_id"`
	//Hireable                interface{} `json:"hireable"`
	//HtmlURL                 string      `json:"html_url"`
	//Location                interface{} `json:"location"`
	//NodeID                  string      `json:"node_id"`
	//NotificationEmail       interface{} `json:"notification_email"`
	//OrganizationsURL        string      `json:"organizations_url"`
	//OwnedPrivateRepos       int         `json:"owned_private_repos"`
	//Plan                    Plan        `json:"plan"`
	//PrivateGists            int         `json:"private_gists"`
	//PublicGists             int         `json:"public_gists"`
	//PublicRepos             int         `json:"public_repos"`
	//ReceivedEventsURL       string      `json:"received_events_url"`
	//ReposURL                string      `json:"repos_url"`
	//SiteAdmin               bool        `json:"site_admin"`
	//StarredURL              string      `json:"starred_url"`
	//SubscriptionsURL        string      `json:"subscriptions_url"`
	//TotalPrivateRepos       int         `json:"total_private_repos"`
	//TwitterUsername         interface{} `json:"twitter_username"`
	//TwoFactorAuthentication bool        `json:"two_factor_authentication"`
	//Type                    string      `json:"type"`
	//UpdatedAt               string      `json:"updated_at"`
	//URL                     string      `json:"url"`
	//UserViewType            string      `json:"user_view_type"`
}

//type Plan struct {
//	Collaborators int    `json:"collaborators"`
//	Name          string `json:"name"`
//	PrivateRepos  int    `json:"private_repos"`
//	Space         int    `json:"space"`
//}

type RegionConfig struct {
	ID uuid.UUID `gorm:"column:id;type:uuid;default:gen_random_uuid();primary_key"`
	// domain_region_key: domain_key
	Key    string `gorm:"column:key;type:text"`
	Value  string `gorm:"column:value;type:text"`
	Region string `gorm:"column:region;type:text"`
}

func (RegionConfig) TableName() string {
	return "RegionConfig"
}

type NotificationRecipient struct {
	UserName    string    `json:"user_name" gorm:"column:user_name"`
	Email       string    `json:"email,omitempty" gorm:"column:email"`
	PhoneNumber string    `json:"phone_number,omitempty" gorm:"column:phone_number"`
	UserID      string    `json:"user_id,omitempty" gorm:"column:user_id"`
	UserUID     uuid.UUID `json:"user_uid,omitempty" gorm:"column:user_uid"`
}
