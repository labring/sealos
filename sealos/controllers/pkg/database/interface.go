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
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"

	"gorm.io/gorm"

	"go.mongodb.org/mongo-driver/bson/primitive"

	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/labring/sealos/controllers/pkg/database/cockroach"

	"github.com/labring/sealos/controllers/pkg/types"

	"github.com/labring/sealos/controllers/pkg/common"

	"github.com/labring/sealos/controllers/pkg/resources"
)

type Interface interface {
	Account
	Traffic
	CVM
	Creator
}

type CVM interface {
	GetPendingStateInstance(regionUID string) (cvmMap map[string][]types.CVMBilling, err error)
	SetDoneStateInstance(instanceIDs ...primitive.ObjectID) error
}

type Account interface {
	GetBillingLastUpdateTime(owner string, _type common.Type) (bool, time.Time, error)
	GetOwnersRecentUpdates(ownerList []string, checkTime time.Time) ([]string, error)
	GetTimeUsedNamespaceList(startTime, endTime time.Time) ([]string, error)
	SaveBillings(billing ...*resources.Billing) error
	SaveObjTraffic(obs ...*types.ObjectStorageTraffic) error
	GetAllLatestObjTraffic(startTime, endTime time.Time) ([]types.ObjectStorageTraffic, error)
	HandlerTimeObjBucketSentTraffic(startTime, endTime time.Time, bucket string) (int64, error)
	GetTimeObjBucketBucket(startTime, endTime time.Time) ([]string, error)
	GetUnsettingBillingHandler(owner string) ([]resources.BillingHandler, error)
	UpdateBillingStatus(orderIDs []string, status resources.BillingStatus) error
	GetUpdateTimeForCategoryAndPropertyFromMetering(category string, property string) (time.Time, error)
	GetAllPayment() ([]resources.Billing, error)
	InitDefaultPropertyTypeLS() error
	SavePropertyTypes(types []resources.PropertyType) error
	GetBillingCount(accountType common.Type, startTime, endTime time.Time) (count, amount int64, err error)
	GenerateBillingData(startTime, endTime time.Time, prols *resources.PropertyTypeLS, ownerToNS map[string][]string) (map[string][]*resources.Billing, error)
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

	GetNamespaceTraffic(ctx context.Context, startTime, endTime time.Time) (result map[string]int64, err error)
}

type AccountV2 interface {
	Close() error
	GetGlobalDB() *gorm.DB
	GetLocalDB() *gorm.DB
	GetUserCr(user *types.UserQueryOpts) (*types.RegionUserCr, error)
	GetUser(ops *types.UserQueryOpts) (*types.User, error)
	GetUserUID(ops *types.UserQueryOpts) (uuid.UUID, error)
	GetUserID(ops *types.UserQueryOpts) (string, error)
	GetAccount(user *types.UserQueryOpts) (*types.Account, error)
	GetAccountWithCredits(userUID uuid.UUID) (*types.UsableBalanceWithCredits, error)
	GetAvailableCredits(ops *types.UserQueryOpts) ([]types.Credits, error)
	GetAccountConfig() (types.AccountConfig, error)
	InsertAccountConfig(config *types.AccountConfig) error
	GetRegions() ([]types.Region, error)
	GetLocalRegion() types.Region
	GetUserOauthProvider(ops *types.UserQueryOpts) ([]types.OauthProvider, error)
	GetWorkspace(namespaces ...string) ([]types.Workspace, error)
	GetUserRechargeDiscount(ops *types.UserQueryOpts) (types.UserRechargeDiscount, error)
	SetAccountCreateLocalRegion(account *types.Account, region string) error
	CreateUser(oAuth *types.OauthProvider, regionUserCr *types.RegionUserCr, user *types.User, workspace *types.Workspace, userWorkspace *types.UserWorkspace) error
	AddBalance(user *types.UserQueryOpts, balance int64) error
	AddDeductionBalanceWithCredits(ops *types.UserQueryOpts, amount int64, orderIDs []string) error
	ReduceBalance(ops *types.UserQueryOpts, amount int64) error
	ReduceDeductionBalance(ops *types.UserQueryOpts, amount int64) error
	NewAccount(user *types.UserQueryOpts) (*types.Account, error)
	NewAccountWithFreeSubscriptionPlan(ops *types.UserQueryOpts) (*types.Account, error)
	GetSubscriptionPlan(planName string) (*types.SubscriptionPlan, error)
	Payment(payment *types.Payment) error
	PaymentWithFunc(payment *types.Payment, preDo, postDo func(tx *gorm.DB) error) error
	GlobalTransactionHandler(funcs ...func(tx *gorm.DB) error) error
	SavePayment(payment *types.Payment) error
	GetUnInvoicedPaymentListWithIDs(ids []string) ([]types.Payment, error)
	CreatePaymentOrder(order *types.PaymentOrder) error
	CreateSubscription(subscription *types.Subscription) error
	SetCardInfo(info *types.CardInfo) (uuid.UUID, error)
	GetCardInfo(cardID, userUID uuid.UUID) (*types.CardInfo, error)
	GetAllCardInfo(ops *types.UserQueryOpts) ([]types.CardInfo, error)
	GetSubscription(ops *types.UserQueryOpts) (*types.Subscription, error)
	GetSubscriptionPlanList() ([]types.SubscriptionPlan, error)
	SetSubscriptionPlanList(plans []types.SubscriptionPlan) error
	GetCardList(ops *types.UserQueryOpts) ([]types.CardInfo, error)
	DeleteCardInfo(id uuid.UUID, userUID uuid.UUID) error
	SetDefaultCard(cardID uuid.UUID, userUID uuid.UUID) error
	CreateAccount(ops *types.UserQueryOpts, account *types.Account) (*types.Account, error)
	TransferAccount(from, to *types.UserQueryOpts, amount int64) error
	TransferAccountAll(from, to *types.UserQueryOpts) error
	AddDeductionBalance(user *types.UserQueryOpts, balance int64) error
	AddDeductionBalanceWithDB(ops *types.UserQueryOpts, amount int64, tx *gorm.DB) error
	AddDeductionBalanceWithFunc(ops *types.UserQueryOpts, amount int64, preDo, postDo func() error) error
}

type Creator interface {
	CreateBillingIfNotExist() error
	//suffix by day, eg： monitor_20200101
	CreateMonitorTimeSeriesIfNotExist(collTime time.Time) error
	CreateTTLTrafficTimeSeries() error
}

const (
	MongoURI           = "MONGO_URI"
	CVMMongoURI        = "CVM_MONGO_URI"
	GlobalCockroachURI = "GLOBAL_COCKROACH_URI"
	LocalCockroachURI  = "LOCAL_COCKROACH_URI"
	TrafficMongoURI    = "TRAFFIC_MONGO_URI"
)

var _ = AccountV2(&cockroach.Cockroach{})

func NewAccountV2(globalURI, localURI string) (AccountV2, error) {
	return cockroach.NewCockRoach(globalURI, localURI)
}

func InitRegionEnv(db *gorm.DB, localDomain string) error {
	var regionENV []types.RegionConfig
	if err := db.Model(&types.RegionConfig{}).Find(&regionENV).Error; err != nil && err != gorm.ErrRecordNotFound {
		return fmt.Errorf("failed to get region env: %v", err)
	}
	// set global env
	for _, envCfg := range regionENV {
		if strings.ToUpper(envCfg.Region) == "GLOBAL" {
			if err := os.Setenv(envCfg.Key, envCfg.Value); err != nil {
				return fmt.Errorf("set global env error: %v", err)
			}
		}
	}
	// region env Cover
	for _, envCfg := range regionENV {
		if envCfg.Region == localDomain {
			if err := os.Setenv(envCfg.Key, envCfg.Value); err != nil {
				return fmt.Errorf("set region env error: %v", err)
			}
		}
	}
	return nil
}
