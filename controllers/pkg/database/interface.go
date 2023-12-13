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

	"github.com/labring/sealos/controllers/pkg/types"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	"github.com/labring/sealos/controllers/pkg/resources"
)

type Interface interface {
	Account
	Auth
}

type Auth interface {
	GetUser(k8sUser string) (*types.User, error)
}

type Account interface {
	//InitDB() error
	GetBillingLastUpdateTime(owner string, _type accountv1.Type) (bool, time.Time, error)
	GetBillingHistoryNamespaceList(ns *accountv1.NamespaceBillingHistorySpec, owner string) ([]string, error)
	GetBillingHistoryNamespaces(startTime, endTime *time.Time, billType int, owner string) ([]string, error)
	SaveBillings(billing ...*resources.Billing) error
	QueryBillingRecords(billingRecordQuery *accountv1.BillingRecordQuery, owner string) error
	GetUnsettingBillingHandler(owner string) ([]resources.BillingHandler, error)
	UpdateBillingStatus(orderID string, status resources.BillingStatus) error
	GetUpdateTimeForCategoryAndPropertyFromMetering(category string, property string) (time.Time, error)
	GetAllPricesMap() (map[string]resources.Price, error)
	InitDefaultPropertyTypeLS() error
	SavePropertyTypes(types []resources.PropertyType) error
	GetBillingCount(accountType accountv1.Type, startTime, endTime time.Time) (count, amount int64, err error)
	GenerateBillingData(startTime, endTime time.Time, prols *resources.PropertyTypeLS, namespaces []string, owner string) (orderID []string, amount int64, err error)
	InsertMonitor(ctx context.Context, monitors ...*resources.Monitor) error
	DropMonitorCollectionsOlderThan(days int) error
	Disconnect(ctx context.Context) error
	Creator
}

type Creator interface {
	CreateBillingIfNotExist() error
	//suffix by day, eg： monitor_20200101
	CreateMonitorTimeSeriesIfNotExist(collTime time.Time) error
}

type MeteringOwnerTimeResult struct {
	//Owner  string           `bson:"owner"`
	Time   time.Time        `bson:"time"`
	Amount int64            `bson:"amount"`
	Costs  map[string]int64 `bson:"costs"`
}

//func NewDBInterface(ctx context.Context, mongoURI string) (Interface, error) {
//	return mongo.NewMongoInterface(ctx, mongoURI)
//}

const (
	MongoURI = "MONGO_URI"
	//MongoUsername      = "MONGO_USERNAME"
	//MongoPassword      = "MONGO_PASSWORD"
	//RetentionDay       = "RETENTION_DAY"
	//PermanentRetention = "PERMANENT_RETENTION"
)
