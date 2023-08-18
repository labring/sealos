// Copyright © 2023 sealos.
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

package database

import (
	"context"
	"time"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	"github.com/labring/sealos/controllers/pkg/common"
)

type Interface interface {
	//InitDB() error
	GetMeteringOwnerTimeResult(queryTime time.Time, queryCategories, queryProperties []string, queryOwner string) (*MeteringOwnerTimeResult, error)
	GetBillingLastUpdateTime(owner string, _type accountv1.Type) (bool, time.Time, error)
	SaveBillingsWithAccountBalance(accountBalanceSpec *accountv1.AccountBalanceSpec) error
	QueryBillingRecords(billingRecordQuery *accountv1.BillingRecordQuery, owner string) error
	GetUpdateTimeForCategoryAndPropertyFromMetering(category string, property string) (time.Time, error)
	GetAllPricesMap() (map[string]common.Price, error)
	GetBillingCount(accountType accountv1.Type, startTime, endTime time.Time) (count, amount int64, err error)
	GenerateMeteringData(startTime, endTime time.Time, prices map[string]common.Price) error
	InsertMonitor(ctx context.Context, monitors ...*common.Monitor) error
	Disconnect(ctx context.Context) error
	Creator
}

type Creator interface {
	CreateBillingIfNotExist() error
	//suffix by day, eg： monitor_20200101
	CreateMonitorTimeSeriesIfNotExist(collTime time.Time) error
	CreateMeteringTimeSeriesIfNotExist() error
}

type MeteringOwnerTimeResult struct {
	Owner  string           `bson:"owner"`
	Time   time.Time        `bson:"time"`
	Amount int64            `bson:"amount"`
	Costs  map[string]int64 `bson:"costs"`
}
