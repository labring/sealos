package database

import (
	"context"
	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	"github.com/labring/sealos/controllers/pkg/common"
	"time"
)

type Interface interface {
	//InitDB() error
	GetMeteringOwnerTimeResult(queryTime time.Time, queryCategories, queryProperties []string, queryOwner string) (*MeteringOwnerTimeResult, error)
	SaveBillingsWithAccountBalance(accountBalanceSpec *accountv1.AccountBalanceSpec) error
	QueryBillingRecords(billingRecordQuery *accountv1.BillingRecordQuery, owner string) error
	GetUpdateTimeForCategoryAndPropertyFromMetering(category string, property string) (time.Time, error)
	GetAllPricesMap() (map[string]common.Price, error)
	GenerateMeteringData(startTime, endTime time.Time, prices map[string]common.Price) error
	InsertMonitor(ctx context.Context, monitors ...*common.Monitor) error
	Disconnect(ctx context.Context) error
	TimeSeries
}

type TimeSeries interface {
	CreateBillingTimeSeriesIfNotExist() error
	CreateMonitorTimeSeriesIfNotExist() error
	CreateMeteringTimeSeriesIfNotExist() error
}

type MeteringOwnerTimeResult struct {
	Owner  string           `bson:"owner"`
	Time   time.Time        `bson:"time"`
	Amount int64            `bson:"amount"`
	Costs  map[string]int64 `bson:"costs"`
}
