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
	ID            uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primary_key" json:"id"`
	Title         string     `gorm:"type:varchar(255);not null" json:"title"`
	Description   string     `gorm:"type:text" json:"description"`
	Reward        int64      `gorm:"type:int;not null" json:"reward"`
	Order         int        `gorm:"type:int;not null" json:"order"`
	IsActive      bool       `gorm:"type:boolean;default:true" json:"is_active"`
	IsNewUserTask bool       `gorm:"type:boolean;default:false" json:"is_new_user_task"`
	TaskType      TaskType   `gorm:"type:varchar(20);not null" json:"task_type"`
	CreatedAt     time.Time  `gorm:"type:timestamptz(3);default:now()" json:"created_at"`
	UpdatedAt     time.Time  `gorm:"type:timestamptz(3);autoUpdateTime" json:"updated_at"`
	UserTasks     []UserTask `gorm:"foreignKey:TaskId;references:ID" json:"user_tasks"`
}

// UserTask represents the UserTask model in Go with GORM annotations.
type UserTask struct {
	ID           uuid.UUID  `gorm:"type:uuid;default:gen_random_uuid();primary_key" json:"id"`
	UserUID      uuid.UUID  `gorm:"type:uuid;not null" json:"user_uid"`
	TaskID       uuid.UUID  `gorm:"type:uuid;not null" json:"task_id"`
	Status       TaskStatus `gorm:"type:varchar(20);not null" json:"status"`
	RewardStatus string     `gorm:"type:varchar(20);not null" json:"reward_status"`
	CompletedAt  time.Time  `gorm:"type:timestamptz(3);not null" json:"completed_at"`
	CreatedAt    time.Time  `gorm:"type:timestamptz(3);default:now()" json:"created_at"`
	UpdatedAt    time.Time  `gorm:"type:timestamptz(3);autoUpdateTime" json:"updated_at"`
	User         User       `gorm:"foreignKey:UserUid;references:Uid" json:"user"`
	Task         Task       `gorm:"foreignKey:TaskId;references:ID" json:"task"`

	// Unique constraint on UserUid and TaskId
	// Index on TaskId
}

// TaskType represents the TaskType enum in Go.
type TaskType string

const (
	TaskTypeLaunchpad  TaskType = "LAUNCHPAD"
	TaskTypeCostcenter TaskType = "COSTCENTER"
	TaskTypeDatabase   TaskType = "DATABASE"
	TaskTypeDesktop    TaskType = "DESKTOP"
)

// TaskStatus represents the TaskStatus enum in Go.
type TaskStatus string

const (
	TaskStatusNotCompleted TaskStatus = "NOT_COMPLETED"
	TaskStatusCompleted    TaskStatus = "COMPLETED"
)

const (
	RewardStatusCompleted = "COMPLETED"
	RewardStatusPending   = "Pending"
)
