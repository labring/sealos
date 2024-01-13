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
	Balance                 int64
	DeductionBalance        int64
}

func (Account) TableName() string {
	return "Account"
}

type RealUser struct {
	UID         uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primary_key"`
	CreatedAt   time.Time `gorm:"type:timestamp(3) with time zone;default:current_timestamp();not null"`
	UpdatedAt   time.Time `gorm:"type:timestamp(3) with time zone;not null"`
	AvatarURI   string    `gorm:"type:text;not null"`
	DisplayName string    `gorm:"type:text;not null"`
}

type Region struct {
	UID         uuid.UUID `gorm:"type:uid;default:gen_random_uuid();primary_key"`
	DisplayName string    `gorm:"type:text;not null"`
	Location    string    `gorm:"type:text;not null"`
	UTCDelta    int       `gorm:"type:integer;not null"`
	Domain      string    `gorm:"type:text;not null"`
}

type RegionUser struct {
	UID         uuid.UUID `gorm:"type:uid;default:gen_random_uuid();primary_key"`
	ID          string    `gorm:"type:text;not null;unique"`
	RegionUID   uuid.UUID `gorm:"column:regionUid;type:uuid;not null"`
	RealUserUID uuid.UUID `gorm:"column:realUserUid;type:uuid;not null"`
	CreatedAt   time.Time `gorm:"type:timestamp(3);default:current_timestamp();not null"`
	UpdatedAt   time.Time `gorm:"type:timestamp(3);default:current_timestamp();not null"`
}

func (RealUser) TableName() string {
	return "RealUser"
}

func (Region) TableName() string {
	return "Region"
}

func (RegionUser) TableName() string {
	return "RegionUser"
}

type RegionUserToWorkspace struct {
	UID           uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primary_key"`
	CreatedAt     time.Time  `gorm:"type:timestamp(3) with time zone;default:current_timestamp();not null"`
	UpdatedAt     time.Time  `gorm:"type:timestamp(3) with time zone;not null"`
	WorkspaceUID  uuid.UUID  `gorm:"type:uuid;not null"`
	RegionUserUID uuid.UUID  `gorm:"type:uuid;not null"`
	Role          Role       `gorm:"type:defaultdb.public.Role;default:'DEVELOPER';not null"`
	Status        JoinStatus `gorm:"type:JoinStatus;not null"`
	IsPrivate     bool       `gorm:"type:boolean;not null"`
	JoinAt        time.Time  `gorm:"type:timestamp(3) with time zone"`
}

type Workspace struct {
	UID         uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primary_key"`
	ID          string    `gorm:"type:text;not null;unique"`
	DisplayName string    `gorm:"type:text;not null"`
	CreatedAt   time.Time `gorm:"type:timestamp(3) with time zone;default:current_timestamp();not null"`
	UpdatedAt   time.Time `gorm:"type:timestamp(3) with time zone;not null"`
}

// Role and JoinStatus are custom types that need to be defined based on your specific implementation.
type Role string
type JoinStatus string
