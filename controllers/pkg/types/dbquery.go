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

type UserQueryOpts struct {
	UID         uuid.UUID
	ID          string
	Owner       string
	IgnoreEmpty bool
}

type GetTransfersReq struct {
	*UserQueryOpts
	// can be empty to get all transfers
	TransferID string `json:"transferID"`

	// 0: all, 1: in, 2: out
	Type     TransferType `json:"type"`
	LimitReq `json:",inline"`
}

type TransferType int

const (
	TypeTransferAll TransferType = iota
	TypeTransferIn
	TypeTransferOut
)

type TimeRange struct {
	StartTime time.Time `json:"startTime" bson:"startTime" example:"2021-01-01T00:00:00Z"`
	EndTime   time.Time `json:"endTime" bson:"endTime" example:"2021-12-01T00:00:00Z"`
}

type GetTransfersResp struct {
	Transfers []Transfer `json:"transfers"`
	LimitResp `json:",inline"`
}

type LimitReq struct {
	Page      int `json:"page"`
	PageSize  int `json:"pageSize"`
	TimeRange `json:",inline"`
}

type LimitResp struct {
	Total     int64 `json:"total"`
	TotalPage int64 `json:"totalPage"`
}
