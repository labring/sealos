/*
Copyright 2024.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package types

import (
	"time"

	"github.com/google/uuid"
)

// Task represents the Task model in Go with GORM annotations.
type Task struct {
	ID            uuid.UUID `gorm:"column:id;type:uuid;default:gen_random_uuid();primary_key" json:"id"`
	Title         string    `gorm:"column:title;type:text;not null" json:"title"`
	Description   string    `gorm:"column:description;type:text;not null" json:"description"`
	Reward        int64     `gorm:"column:reward;type:bigint;not null" json:"reward"`
	Order         int       `gorm:"column:order;type:integer;not null" json:"order"`
	IsActive      bool      `gorm:"column:isActive;type:boolean;default:true;not null" json:"isActive"`
	IsNewUserTask bool      `gorm:"column:isNewUserTask;type:boolean;default:false;not null" json:"isNewUserTask"`
	TaskType      TaskType  `gorm:"column:taskType;type:TaskType;not null" json:"taskType"`
	CreatedAt     time.Time `gorm:"column:createdAt;type:timestamp(3) with time zone;default:current_timestamp();not null" json:"createdAt"`
	UpdatedAt     time.Time `gorm:"column:updatedAt;type:timestamp(3) with time zone;not null" json:"updatedAt"`
}

// UserTask represents the UserTask model in Go with GORM annotations.
type UserTask struct {
	ID           uuid.UUID  `gorm:"column:id;type:uuid;default:gen_random_uuid();primary_key" json:"id"`
	UserUID      uuid.UUID  `gorm:"column:userUid;type:uuid;not null" json:"userUid"`
	TaskID       uuid.UUID  `gorm:"column:taskId;type:uuid;not null" json:"taskId"`
	Status       TaskStatus `gorm:"column:status;type:TaskStatus;not null" json:"status"`
	RewardStatus TaskStatus `gorm:"column:rewardStatus;type:TaskStatus;not null" json:"rewardStatus"`
	CompletedAt  time.Time  `gorm:"column:completedAt;type:timestamp(3);not null" json:"completedAt"`
	CreatedAt    time.Time  `gorm:"column:createdAt;type:timestamp(3) with time zone;default:current_timestamp();not null" json:"createdAt"`
	UpdatedAt    time.Time  `gorm:"column:updatedAt;type:timestamp(3) with time zone;not null" json:"updatedAt"`

	//User         User       `gorm:"foreignKey:UserUid;references:UID" json:"user"`
	//Task         Task       `gorm:"foreignKey:TaskId;references:ID" json:"task"`
}

// TableName specifies the table name for GORM
func (Task) TableName() string {
	return "Task"
}

// TableName specifies the table name for GORM
func (UserTask) TableName() string {
	return "UserTask"
}

// TaskType represents the TaskType enum in Go.
type TaskType string

//const (
//	TaskTypeLaunchpad  TaskType = "LAUNCHPAD"
//	TaskTypeCostcenter TaskType = "COSTCENTER"
//	TaskTypeDatabase   TaskType = "DATABASE"
//	TaskTypeDesktop    TaskType = "DESKTOP"
//)

// TaskStatus represents the TaskStatus enum in Go.
type TaskStatus string

const (
	TaskStatusNotCompleted TaskStatus = "NOT_COMPLETED"
	TaskStatusCompleted    TaskStatus = "COMPLETED"
)
