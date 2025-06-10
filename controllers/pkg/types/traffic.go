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

type ObjectStorageTraffic struct {
	Time   time.Time `json:"time" bson:"time"`
	User   string    `json:"user" bson:"user"`
	Bucket string    `json:"bucket" bson:"bucket"`
	//bytes
	TotalSent int64 `json:"totalSent" bson:"totalSent"`

	//The sent traffic since the last time
	Sent int64 `json:"sent" bson:"sent"`
}

type UserTimeRangeTraffic struct {
	CreatedAt     time.Time                  `gorm:"type:timestamp(3) with time zone;default:current_timestamp"`
	UpdatedAt     time.Time                  `gorm:"type:timestamp(3) with time zone;autoUpdateTime;default:current_timestamp"`
	NextCleanTime time.Time                  `gorm:"type:timestamp(3) with time zone"`
	UserUID       uuid.UUID                  `gorm:"type:uuid;primaryKey" json:"user_uid" bson:"user_uid"`
	SentBytes     int64                      `gorm:"type:bigint;default:0" json:"sent_bytes" bson:"sent_bytes"`
	Status        UserTimeRangeTrafficStatus `gorm:"type:varchar(20);default:'processing'" json:"status" bson:"status"`
}

func (UserTimeRangeTraffic) TableName() string {
	return "UserTimeRangeTraffic"
}

type UserTimeRangeTrafficStatus string

const (
	UserTimeRangeTrafficStatusUsedUp     UserTimeRangeTrafficStatus = "used_up"
	UserTimeRangeTrafficStatusProcessing UserTimeRangeTrafficStatus = "processing"
	UserTimeRangeTrafficStatusSkip       UserTimeRangeTrafficStatus = "skip"

	UserTimeRangeTrafficStatusRecovering UserTimeRangeTrafficStatus = "recovering"
)
