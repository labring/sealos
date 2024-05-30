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

	"go.mongodb.org/mongo-driver/bson/primitive"

	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/labring/sealos/controllers/pkg/database/cockroach"

	"github.com/labring/sealos/controllers/pkg/types"

	"github.com/labring/sealos/controllers/pkg/common"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	"github.com/labring/sealos/controllers/pkg/resources"
)

type Interface interface {
	Account
	Traffic
	CVM
}

type CVM interface {
	GetPendingStateInstance(regionUID string) (cvmMap map[string][]types.CVMBilling, err error)
	SetDoneStateInstance(instanceIDs ...primitive.ObjectID) error
}

type Account interface {
	//InitDB() error
	GetBillingLastUpdateTime(owner string, _type common.Type) (bool, time.Time, error)
	GetBillingHistoryNamespaceList(ns *accountv1.NamespaceBillingHistorySpec, owner string) ([]string, error)
	GetBillingHistoryNamespaces(startTime, endTime *time.Time, billType int, owner string) ([]string, error)
	SaveBillings(billing ...*resources.Billing) error
	QueryBillingRecords(billingRecordQuery *accountv1.BillingRecordQuery, owner string) error
	GetUnsettingBillingHandler(owner string) ([]resources.BillingHandler, error)
	UpdateBillingStatus(orderID string, status resources.BillingStatus) error
	GetUpdateTimeForCategoryAndPropertyFromMetering(category string, property string) (time.Time, error)
	GetAllPricesMap() (map[string]resources.Price, error)
	GetAllPayment() ([]resources.Billing, error)
	InitDefaultPropertyTypeLS() error
	SavePropertyTypes(types []resources.PropertyType) error
	GetBillingCount(accountType common.Type, startTime, endTime time.Time) (count, amount int64, err error)
	//GetNodePortAmount(owner string, endTime time.Time) (int64, error)
	GenerateBillingData(startTime, endTime time.Time, prols *resources.PropertyTypeLS, namespaces []string, owner string) (orderID []string, amount int64, err error)
	InsertMonitor(ctx context.Context, monitors ...*resources.Monitor) error
	GetDistinctMonitorCombinations(startTime, endTime time.Time) ([]resources.Monitor, error)
	DropMonitorCollectionsOlderThan(days int) error
	Disconnect(ctx context.Context) error
	Creator
}

type BillingRecordQuery struct {
	Page      int         `json:"page"`
	PageSize  int         `json:"pageSize"`
	Namespace string      `json:"namespace,omitempty"`
	StartTime v1.Time     `json:"startTime"`
	EndTime   v1.Time     `json:"endTime"`
	OrderID   string      `json:"orderID,omitempty"`
	Type      common.Type `json:"type"`
	AppType   string      `json:"appType,omitempty"`
}

type Traffic interface {
	GetTrafficSentBytes(startTime, endTime time.Time, namespace string, _type uint8, name string) (int64, error)
	GetTrafficRecvBytes(startTime, endTime time.Time, namespace string, _type uint8, name string) (int64, error)

	GetPodTrafficSentBytes(startTime, endTime time.Time, namespace string, name string) (int64, error)
	GetPodTrafficRecvBytes(startTime, endTime time.Time, namespace string, name string) (int64, error)
}

type AccountV2 interface {
	Close() error
	GetUserCr(user *types.UserQueryOpts) (*types.RegionUserCr, error)
	GetUser(ops *types.UserQueryOpts) (*types.User, error)
	CreateUser(oAuth *types.OauthProvider, regionUserCr *types.RegionUserCr, user *types.User, workspace *types.Workspace, userWorkspace *types.UserWorkspace) error
	GetAccount(user *types.UserQueryOpts) (*types.Account, error)
	SetAccountCreateLocalRegion(account *types.Account, region string) error
	GetUserOauthProvider(ops *types.UserQueryOpts) ([]types.OauthProvider, error)
	AddBalance(user *types.UserQueryOpts, balance int64) error
	ReduceBalance(ops *types.UserQueryOpts, amount int64) error
	ReduceDeductionBalance(ops *types.UserQueryOpts, amount int64) error
	NewAccount(user *types.UserQueryOpts) (*types.Account, error)
	Payment(payment *types.Payment) error
	SavePayment(payment *types.Payment) error
	CreateErrorPaymentCreate(payment types.Payment, errorMsg string) error
	CreateAccount(ops *types.UserQueryOpts, account *types.Account) (*types.Account, error)
	CreateErrorAccountCreate(account *types.Account, owner, errorMsg string) error
	TransferAccount(from, to *types.UserQueryOpts, amount int64) error
	TransferAccountAll(from, to *types.UserQueryOpts) error
	TransferAccountV1(owner string, account *types.Account) (*types.Account, error)
	GetUserAccountRechargeDiscount(user *types.UserQueryOpts) (*types.RechargeDiscount, error)
	AddDeductionBalance(user *types.UserQueryOpts, balance int64) error
	AddDeductionBalanceWithFunc(ops *types.UserQueryOpts, amount int64, preDo, postDo func() error) error
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
	MongoURI           = "MONGO_URI"
	CVMMongoURI        = "CVM_MONGO_URI"
	GlobalCockroachURI = "GLOBAL_COCKROACH_URI"
	LocalCockroachURI  = "LOCAL_COCKROACH_URI"
	TrafficMongoURI    = "TRAFFIC_MONGO_URI"
	//MongoUsername      = "MONGO_USERNAME"
	//MongoPassword      = "MONGO_PASSWORD"
	//RetentionDay       = "RETENTION_DAY"
	//PermanentRetention = "PERMANENT_RETENTION"
)

var _ = AccountV2(&cockroach.Cockroach{})

func NewAccountV2(globalURI, localURI string) (AccountV2, error) {
	return cockroach.NewCockRoach(globalURI, localURI)
}
