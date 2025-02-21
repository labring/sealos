package dao

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/sirupsen/logrus"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"

	"gorm.io/gorm"

	gonanoid "github.com/matoous/go-nanoid/v2"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"github.com/labring/sealos/controllers/pkg/database/cockroach"

	"github.com/labring/sealos/controllers/pkg/types"

	"github.com/labring/sealos/service/account/common"

	"github.com/labring/sealos/controllers/pkg/resources"

	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/google/uuid"
	"github.com/labring/sealos/service/account/helper"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type Interface interface {
	GetBillingHistoryNamespaceList(req *helper.NamespaceBillingHistoryReq) ([][]string, error)
	GetAccountWithWorkspace(workspace string) (*types.Account, error)
	GetProperties() ([]common.PropertyQuery, error)
	GetCosts(req helper.ConsumptionRecordReq) (common.TimeCostsMap, error)
	GetAppCosts(req *helper.AppCostsReq) (*common.AppCosts, error)
	ChargeBilling(req *helper.AdminChargeBillingReq) error
	GetAppCostTimeRange(req helper.GetCostAppListReq) (helper.TimeRange, error)
	GetCostOverview(req helper.GetCostAppListReq) (helper.CostOverviewResp, error)
	GetBasicCostDistribution(req helper.GetCostAppListReq) (map[string]int64, error)
	GetCostAppList(req helper.GetCostAppListReq) (helper.CostAppListResp, error)
	Disconnect(ctx context.Context) error
	GetConsumptionAmount(req helper.ConsumptionRecordReq) (int64, error)
	GetRechargeAmount(ops types.UserQueryOpts, startTime, endTime time.Time) (int64, error)
	GetPropertiesUsedAmount(user string, startTime, endTime time.Time) (map[string]int64, error)
	GetAccount(ops types.UserQueryOpts) (*types.Account, error)
	GetPayment(ops *types.UserQueryOpts, req *helper.GetPaymentReq) ([]types.Payment, types.LimitResp, error)
	GetMonitorUniqueValues(startTime, endTime time.Time, namespaces []string) ([]common.Monitor, error)
	ApplyInvoice(req *helper.ApplyInvoiceReq) (invoice types.Invoice, payments []types.Payment, err error)
	GetInvoice(req *helper.GetInvoiceReq) ([]types.Invoice, types.LimitResp, error)
	GetInvoicePayments(invoiceID string) ([]types.Payment, error)
	SetStatusInvoice(req *helper.SetInvoiceStatusReq) error
	GetWorkspaceName(namespaces []string) ([][]string, error)
	SetPaymentInvoice(req *helper.SetPaymentInvoiceReq) error
	Transfer(req *helper.TransferAmountReq) error
	GetTransfer(ops *types.GetTransfersReq) (*types.GetTransfersResp, error)
	GetUserID(ops types.UserQueryOpts) (string, error)
	GetUserCrName(ops types.UserQueryOpts) (string, error)
	GetRegions() ([]types.Region, error)
	GetLocalRegion() types.Region
	UseGiftCode(req *helper.UseGiftCodeReq) (*types.GiftCode, error)
	GetRechargeDiscount(req helper.AuthReq) (helper.RechargeDiscountResp, error)
	ProcessPendingTaskRewards() error
	GetUserRealNameInfo(req *helper.GetRealNameInfoReq) (*types.UserRealNameInfo, error)
	GetEnterpriseRealNameInfo(req *helper.GetRealNameInfoReq) (*types.EnterpriseRealNameInfo, error)
	ReconcileUnsettledLLMBilling(startTime, endTime time.Time) error
	ReconcileActiveBilling(startTime, endTime time.Time) error
	ArchiveHourlyBilling(hourStart, hourEnd time.Time) error
	ActiveBilling(req resources.ActiveBilling) error
	GetCockroach() *cockroach.Cockroach
}

type Account struct {
	*MongoDB
	*Cockroach
}

type MongoDB struct {
	Client            *mongo.Client
	AccountDBName     string
	BillingConn       string
	ActiveBillingConn string
	PropertiesConn    string
	Properties        *resources.PropertyTypeLS
}

type Cockroach struct {
	ck *cockroach.Cockroach
}

func (g *Cockroach) GetCockroach() *cockroach.Cockroach {
	return g.ck
}

func (g *Cockroach) GetAccount(ops types.UserQueryOpts) (*types.Account, error) {
	account, err := g.ck.GetAccount(&ops)
	if err != nil {
		return nil, fmt.Errorf("failed to get account: %v", err)
	}
	return account, nil
}

func (g *Cockroach) GetAccountWithWorkspace(workspace string) (*types.Account, error) {
	return g.ck.GetAccountWithWorkspace(workspace)
}

func (g *Cockroach) GetWorkspaceName(namespaces []string) ([][]string, error) {
	workspaceList := make([][]string, 0)
	workspaces, err := g.ck.GetWorkspace(namespaces...)
	if err != nil {
		return nil, fmt.Errorf("failed to get workspace: %v", err)
	}
	for _, workspace := range workspaces {
		workspaceList = append(workspaceList, []string{workspace.ID, workspace.DisplayName})
	}
	return workspaceList, nil
}

func (g *Cockroach) GetUserID(ops types.UserQueryOpts) (string, error) {
	user, err := g.ck.GetUser(&ops)
	if err != nil {
		return "", fmt.Errorf("failed to get user: %v", err)
	}
	return user.ID, nil
}

func (g *Cockroach) GetUserCrName(ops types.UserQueryOpts) (string, error) {
	user, err := g.ck.GetUserCr(&ops)
	if err != nil {
		return "", err
	}
	return user.CrName, nil
}

func (g *Cockroach) GetPayment(ops *types.UserQueryOpts, req *helper.GetPaymentReq) ([]types.Payment, types.LimitResp, error) {
	if req.PaymentID != "" {
		payment, err := g.ck.GetPaymentWithID(req.PaymentID)
		if err != nil {
			return nil, types.LimitResp{}, fmt.Errorf("failed to get payment with id: %v", err)
		}
		return []types.Payment{*payment}, types.LimitResp{Total: 1, TotalPage: 1}, nil
	}
	return g.ck.GetPaymentWithLimit(ops, types.LimitReq{
		Page:     req.Page,
		PageSize: req.PageSize,
		TimeRange: types.TimeRange{
			StartTime: req.StartTime,
			EndTime:   req.EndTime,
		},
	}, req.Invoiced)
}

func (g *Cockroach) SetPaymentInvoice(req *helper.SetPaymentInvoiceReq) error {
	return g.ck.SetPaymentInvoice(&types.UserQueryOpts{Owner: req.Auth.Owner}, req.PaymentIDList)
}

func (g *Cockroach) Transfer(req *helper.TransferAmountReq) error {
	if req.TransferAll {
		return g.ck.TransferAccountAll(&types.UserQueryOpts{ID: req.Auth.UserID, Owner: req.Owner}, &types.UserQueryOpts{ID: req.ToUser})
	}
	return g.ck.TransferAccount(&types.UserQueryOpts{Owner: req.Owner, ID: req.Auth.UserID}, &types.UserQueryOpts{ID: req.ToUser}, req.Amount)
}

func (g *Cockroach) GetTransfer(ops *types.GetTransfersReq) (*types.GetTransfersResp, error) {
	return g.ck.GetTransfer(ops)
}

func (g *Cockroach) GetRegions() ([]types.Region, error) {
	return g.ck.GetRegions()
}

func (g *Cockroach) GetLocalRegion() types.Region {
	return g.ck.GetLocalRegion()
}

func (g *Cockroach) GetRechargeAmount(ops types.UserQueryOpts, startTime, endTime time.Time) (int64, error) {
	payment, err := g.ck.GetPayment(&ops, startTime, endTime)
	if err != nil {
		return 0, fmt.Errorf("failed to get payment: %v", err)
	}
	paymentAmount := int64(0)
	for i := range payment {
		paymentAmount += payment[i].Amount
	}
	return paymentAmount, nil
}

func (m *MongoDB) GetProperties() ([]common.PropertyQuery, error) {
	propertiesQuery := make([]common.PropertyQuery, 0)
	if m.Properties == nil {
		properties, err := m.getProperties()
		if err != nil {
			return nil, fmt.Errorf("get properties error: %v", err)
		}
		m.Properties = properties
	}
	for _, types := range m.Properties.Types {
		property := common.PropertyQuery{
			Name:      types.Name,
			UnitPrice: types.UnitPrice,
			Unit:      types.UnitString,
			Alias:     types.Alias,
		}
		propertiesQuery = append(propertiesQuery, property)
	}
	return propertiesQuery, nil
}

func (m *MongoDB) GetCosts(req helper.ConsumptionRecordReq) (common.TimeCostsMap, error) {
	owner, startTime, endTime := req.Owner, req.TimeRange.StartTime, req.TimeRange.EndTime
	appType, appName := req.AppType, req.AppName

	timeMatchValue := bson.D{
		primitive.E{Key: "$gte", Value: startTime},
		primitive.E{Key: "$lte", Value: endTime},
	}
	matchValue := bson.D{
		primitive.E{Key: "time", Value: timeMatchValue},
		primitive.E{Key: "owner", Value: owner},
		primitive.E{Key: "type", Value: 0},
	}

	if appType != "" {
		matchValue = append(matchValue, primitive.E{Key: "app_type", Value: resources.AppType[strings.ToUpper(appType)]})
	}
	if req.Namespace != "" {
		matchValue = append(matchValue, primitive.E{Key: "namespace", Value: req.Namespace})
	}

	pipeline := bson.A{
		bson.D{primitive.E{Key: "$match", Value: matchValue}},
	}

	project := bson.D{
		primitive.E{Key: "time", Value: 1},
		primitive.E{Key: "amount", Value: 1},
	}
	if appType != "" && appName != "" && appType != resources.AppStore {
		pipeline = append(pipeline,
			bson.D{primitive.E{Key: "$unwind", Value: "$app_costs"}},
			bson.D{primitive.E{Key: "$match", Value: bson.D{{Key: "app_costs.name", Value: appName}}}},
		)
		project[1] = primitive.E{Key: "amount", Value: "$app_costs.amount"}
	}

	pipeline = append(pipeline,
		bson.D{primitive.E{Key: "$sort", Value: bson.D{{Key: "time", Value: 1}}}},
		bson.D{primitive.E{Key: "$project", Value: project}},
	)

	cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate billing collection: %v", err)
	}
	defer cursor.Close(context.Background())

	var accountBalanceList []struct {
		Time   time.Time `bson:"time"`
		Amount int64     `bson:"amount"`
	}

	if err := cursor.All(context.Background(), &accountBalanceList); err != nil {
		return nil, fmt.Errorf("failed to decode all billing records: %w", err)
	}

	costsMap := make(common.TimeCostsMap, len(accountBalanceList))
	for i := range accountBalanceList {
		costsMap[i] = append(costsMap[i], accountBalanceList[i].Time.Unix())
		costsMap[i] = append(costsMap[i], strconv.FormatInt(accountBalanceList[i].Amount, 10))
	}
	return costsMap, nil
}

func (m *Account) InitDB() error {
	if err := m.ck.InitTables(); err != nil {
		return fmt.Errorf("failed to init tables: %v", err)
	}
	return m.MongoDB.initTables()
}

func (m *MongoDB) initTables() error {
	if exist, err := m.collectionExist(m.AccountDBName, m.ActiveBillingConn); exist || err != nil {
		return err
	}
	indexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "time", Value: 1}},
		Options: options.Index().SetExpireAfterSeconds(30 * 24 * 60 * 60),
	}
	_, err := m.getActiveBillingCollection().Indexes().CreateOne(context.Background(), indexModel)
	if err != nil {
		return fmt.Errorf("failed to create index: %v", err)
	}
	return nil
}

func (m *MongoDB) collectionExist(dbName, collectionName string) (bool, error) {
	// Check if the collection already exists
	collections, err := m.Client.Database(dbName).ListCollectionNames(context.Background(), bson.M{"name": collectionName})
	return len(collections) > 0, err
}

func (m *MongoDB) SaveActiveBillings(billing ...*resources.ActiveBilling) error {
	billings := make([]interface{}, len(billing))
	for i, b := range billing {
		billings[i] = b
	}
	_, err := m.getActiveBillingCollection().InsertMany(context.Background(), billings)
	return err
}

func (m *MongoDB) SaveBillings(billing ...*resources.Billing) error {
	billings := make([]interface{}, len(billing))
	for i, b := range billing {
		billings[i] = b
	}
	_, err := m.getBillingCollection().InsertMany(context.Background(), billings)
	return err
}

func (m *MongoDB) GetAppCosts(req *helper.AppCostsReq) (results *common.AppCosts, rErr error) {
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 10
	}
	pageSize := req.PageSize
	results = &common.AppCosts{
		CurrentPage: req.Page,
	}
	if req.OrderID != "" {
		costs, err := m.GetAppCostsByOrderIDAndAppName(req)
		if err != nil {
			rErr = fmt.Errorf("failed to get app costs by order id and app name: %w", err)
			return
		}
		results.Costs = costs
		results.TotalRecords = len(costs)
		results.TotalPages = 1
		return
	}

	timeMatch := bson.E{Key: "time", Value: bson.D{{Key: "$gte", Value: req.StartTime}, {Key: "$lte", Value: req.EndTime}}}

	matchConditions := bson.D{timeMatch}
	matchConditions = append(matchConditions, bson.E{Key: "owner", Value: req.Owner})
	if req.AppName != "" && req.AppType != "" {
		if strings.ToUpper(req.AppType) != resources.AppStore {
			matchConditions = append(matchConditions, bson.E{Key: "app_costs.name", Value: req.AppName})
		} else {
			matchConditions = append(matchConditions, bson.E{Key: "app_name", Value: req.AppName})
		}
	}
	if req.Namespace != "" {
		matchConditions = append(matchConditions, bson.E{Key: "namespace", Value: req.Namespace})
	}

	if strings.ToUpper(req.AppType) != resources.AppStore {
		var match bson.D
		if req.AppType != "" {
			match = append(matchConditions, bson.E{Key: "app_type", Value: resources.AppType[strings.ToUpper(req.AppType)]})
		} else {
			match = append(matchConditions, bson.E{Key: "app_type", Value: bson.M{"$ne": resources.AppType[resources.AppStore]}})
		}
		if req.OrderID != "" {
			match = bson.D{
				{Key: "order_id", Value: req.OrderID},
				{Key: "owner", Value: req.Owner},
			}
		}
		pipeline := mongo.Pipeline{
			{{Key: "$match", Value: match}},
			{{Key: "$facet", Value: bson.D{
				{Key: "withAppCosts", Value: bson.A{
					bson.D{{Key: "$match", Value: bson.D{{Key: "app_costs", Value: bson.M{"$exists": true}}}}},
					bson.D{{Key: "$unwind", Value: "$app_costs"}},
					bson.D{{Key: "$match", Value: matchConditions}},
					bson.D{{Key: "$project", Value: bson.D{
						{Key: "time", Value: 1},
						{Key: "order_id", Value: 1},
						{Key: "namespace", Value: 1},
						{Key: "used", Value: "$app_costs.used"},
						{Key: "used_amount", Value: "$app_costs.used_amount"},
						{Key: "amount", Value: "$app_costs.amount"},
						{Key: "app_name", Value: "$app_costs.name"},
						{Key: "app_type", Value: "$app_type"},
					}}},
				}},
				{Key: "withoutAppCosts", Value: bson.A{
					bson.D{{Key: "$match", Value: bson.D{
						{Key: "app_costs", Value: bson.M{"$exists": false}},
						{Key: "app_name", Value: bson.M{"$exists": true}},
					}}},
					bson.D{{Key: "$match", Value: matchConditions}},
					bson.D{{Key: "$project", Value: bson.D{
						{Key: "time", Value: 1},
						{Key: "order_id", Value: 1},
						{Key: "namespace", Value: 1},
						{Key: "used", Value: nil},
						{Key: "used_amount", Value: nil},
						{Key: "amount", Value: 1},
						{Key: "app_name", Value: 1},
						{Key: "app_type", Value: 1},
					}}},
				}},
			}}},
			{{Key: "$project", Value: bson.D{
				{Key: "combined", Value: bson.D{{Key: "$concatArrays", Value: bson.A{"$withAppCosts", "$withoutAppCosts"}}}},
			}}},
			{{Key: "$unwind", Value: "$combined"}},
			{{Key: "$replaceRoot", Value: bson.D{{Key: "newRoot", Value: "$combined"}}}},
			{{Key: "$sort", Value: bson.D{
				{Key: "time", Value: -1},
				{Key: "app_name", Value: 1},
				{Key: "_id", Value: 1},
			}}},
			{{Key: "$facet", Value: bson.D{
				{Key: "totalRecords", Value: bson.A{
					bson.D{{Key: "$count", Value: "count"}},
				}},
				{Key: "costs", Value: bson.A{
					bson.D{{Key: "$skip", Value: (req.Page - 1) * pageSize}},
					bson.D{{Key: "$limit", Value: pageSize}},
				}},
			}}},
			{{Key: "$project", Value: bson.D{
				{Key: "total_records", Value: bson.D{{Key: "$arrayElemAt", Value: bson.A{"$totalRecords.count", 0}}}},
				{Key: "total_pages", Value: bson.D{{Key: "$ceil", Value: bson.D{{Key: "$divide", Value: bson.A{bson.D{{Key: "$arrayElemAt", Value: bson.A{"$totalRecords.count", 0}}}, pageSize}}}}}},
				{Key: "costs", Value: 1},
			}}},
		}

		cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
		if err != nil {
			return nil, fmt.Errorf("failed to aggregate billing collection: %v", err)
		}
		if cursor.Next(context.Background()) {
			if err := cursor.Decode(results); err != nil {
				return nil, fmt.Errorf("failed to decode result: %v", err)
			}
		}
	}

	if req.AppType == "" || strings.ToUpper(req.AppType) == resources.AppStore {
		matchConditions = append(matchConditions, bson.E{Key: "app_type", Value: resources.AppType[resources.AppStore]})
		appStoreTotal, err := m.getAppStoreCostsTotal(req)
		if err != nil {
			rErr = fmt.Errorf("failed to get app store costs total: %w", err)
			return
		}
		currentAppPageIsFull := len(results.Costs) == pageSize
		maxAppPageSize := (results.TotalRecords + pageSize - 1) / pageSize
		completedNum := calculateComplement(results.TotalRecords, pageSize)

		if req.Page == maxAppPageSize {
			if !currentAppPageIsFull {
				appStoreCost, err := m.getAppStoreCosts(matchConditions, 0, completedNum)
				if err != nil {
					rErr = fmt.Errorf("failed to get app store costs: %w", err)
					return
				}
				results.Costs = append(results.Costs, appStoreCost.Costs...)
			}
		} else if req.Page > maxAppPageSize {
			skipPageSize := (req.Page - maxAppPageSize - 1) * pageSize
			if skipPageSize < 0 {
				skipPageSize = 0
			}
			appStoreCost, err := m.getAppStoreCosts(matchConditions, completedNum+skipPageSize, req.PageSize)
			if err != nil {
				rErr = fmt.Errorf("failed to get app store costs: %w", err)
				return
			}
			results.Costs = append(results.Costs, appStoreCost.Costs...)
		}
		results.TotalRecords += int(appStoreTotal)
	}
	results.TotalPages = (results.TotalRecords + pageSize - 1) / pageSize
	return results, nil
}

func (m *MongoDB) getAppStoreCostsTotal(req *helper.AppCostsReq) (int64, error) {
	matchConditions := bson.D{
		{Key: "owner", Value: req.Owner},
		{Key: "app_type", Value: resources.AppType[resources.AppStore]},
	}
	if req.AppName != "" {
		matchConditions = append(matchConditions, bson.E{Key: "app_costs.name", Value: req.AppName})
	}
	if req.Namespace != "" {
		matchConditions = append(matchConditions, bson.E{Key: "namespace", Value: req.Namespace})
	}
	matchConditions = append(matchConditions, bson.E{Key: "time", Value: bson.M{
		"$gte": req.StartTime,
		"$lte": req.EndTime,
	}})
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: matchConditions}},
		{{Key: "$count", Value: "total_records"}},
	}
	cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return 0, fmt.Errorf("failed to aggregate billing collection: %v", err)
	}
	defer cursor.Close(context.Background())
	var result struct {
		TotalRecords int64 `bson:"total_records"`
	}
	if cursor.Next(context.Background()) {
		if err := cursor.Decode(&result); err != nil {
			return 0, fmt.Errorf("failed to decode result: %v", err)
		}
	}
	return result.TotalRecords, nil
}

func (m *MongoDB) GetAppCostsByOrderIDAndAppName(req *helper.AppCostsReq) ([]common.AppCost, error) {
	var pipeline mongo.Pipeline
	if req.AppType == resources.AppStore {
		pipeline = mongo.Pipeline{
			{{Key: "$match", Value: bson.D{{Key: "order_id", Value: req.OrderID}, {Key: "owner", Value: req.Owner}}}},
			{{Key: "$unwind", Value: "$app_costs"}},
			{{Key: "$project", Value: bson.D{
				{Key: "app_name", Value: "$app_costs.name"},
				{Key: "app_type", Value: "$app_costs.type"},
				{Key: "time", Value: "$time"},
				{Key: "order_id", Value: "$order_id"},
				{Key: "namespace", Value: "$namespace"},
				{Key: "used", Value: "$app_costs.used"},
				{Key: "used_amount", Value: "$app_costs.used_amount"},
				{Key: "amount", Value: "$app_costs.amount"},
			}}},
		}
	} else {
		pipeline = mongo.Pipeline{
			{{Key: "$match", Value: bson.D{{Key: "order_id", Value: req.OrderID}, {Key: "owner", Value: req.Owner}}}},
			{{Key: "$unwind", Value: "$app_costs"}},
			{{Key: "$match", Value: bson.D{{Key: "app_costs.name", Value: req.AppName}}}},
			{{Key: "$project", Value: bson.D{
				{Key: "app_name", Value: "$app_costs.name"},
				{Key: "app_type", Value: "$app_type"},
				{Key: "time", Value: "$time"},
				{Key: "order_id", Value: "$order_id"},
				{Key: "namespace", Value: "$namespace"},
				{Key: "used", Value: "$app_costs.used"},
				{Key: "used_amount", Value: "$app_costs.used_amount"},
				{Key: "amount", Value: "$app_costs.amount"},
			}}},
		}
	}
	fmt.Printf("pipeline: %v\n", pipeline)
	cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate billing collection: %v", err)
	}
	defer cursor.Close(context.Background())

	var results []common.AppCost
	for cursor.Next(context.Background()) {
		var appCost common.AppCost
		if err := cursor.Decode(&appCost); err != nil {
			return nil, fmt.Errorf("failed to decode result: %v", err)
		}
		results = append(results, appCost)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %v", err)
	}

	return results, nil
}

func (m *MongoDB) getAppStoreCosts(matchConditions bson.D, skip, limit int) (*common.AppCosts, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: matchConditions}},
		{{Key: "$sort", Value: bson.D{
			{Key: "time", Value: -1},
			{Key: "app_name", Value: 1},
			{Key: "_id", Value: 1},
		}}},
		{{Key: "$skip", Value: skip}},
		{{Key: "$limit", Value: limit}},
		{{Key: "$project", Value: bson.D{
			{Key: "_id", Value: 0},
			{Key: "time", Value: 1},
			{Key: "order_id", Value: 1},
			{Key: "namespace", Value: 1},
			{Key: "amount", Value: 1},
			{Key: "app_name", Value: 1},
			{Key: "app_type", Value: 1},
		}}},
	}

	cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate billing collection: %v", err)
	}
	defer cursor.Close(context.Background())

	var results common.AppCosts
	if err := cursor.All(context.Background(), &results.Costs); err != nil {
		return nil, fmt.Errorf("failed to decode results: %v", err)
	}
	return &results, nil
}

func (m *MongoDB) GetCostOverview(req helper.GetCostAppListReq) (resp helper.CostOverviewResp, rErr error) {
	appResp, err := m.GetCostAppList(req)
	if err != nil {
		rErr = fmt.Errorf("failed to get app store list: %w", err)
		return
	}
	resp.LimitResp = appResp.LimitResp
	for _, app := range appResp.Apps {
		totalAmount, err := m.getTotalAppCost(req, app)
		if err != nil {
			rErr = fmt.Errorf("failed to get total app cost: %w", err)
			return
		}
		resp.Overviews = append(resp.Overviews, helper.CostOverview{
			Amount:    totalAmount,
			Namespace: app.Namespace,
			AppType:   app.AppType,
			AppName:   app.AppName,
		})
	}
	return
}

func (m *MongoDB) getTotalAppCost(req helper.GetCostAppListReq, app helper.CostApp) (int64, error) {
	owner := req.Owner
	namespace := app.Namespace
	appName := app.AppName
	appType := app.AppType
	if req.StartTime.IsZero() {
		req.StartTime = time.Now().UTC().Add(-time.Hour * 24 * 30)
		req.EndTime = time.Now().UTC()
	}
	subConsumptionMatch := bson.M{
		"owner":          owner,
		"namespace":      namespace,
		"app_costs.name": appName,
		"app_type":       appType,
		"time": bson.M{
			"$gte": req.StartTime,
			"$lte": req.EndTime,
		},
	}
	consumptionMatch := bson.M{
		"owner":     owner,
		"namespace": namespace,
		"app_name":  appName,
		"app_type":  appType,
		"time": bson.M{
			"$gte": req.StartTime,
			"$lte": req.EndTime,
		},
	}
	var pipeline mongo.Pipeline

	if appType == resources.AppType[resources.AppStore] || appType == resources.AppType[resources.LLMToken] {
		// If appType is app-store || llm-token, match app_name and app_type directly
		pipeline = mongo.Pipeline{
			{{Key: "$match", Value: consumptionMatch}},
			{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: nil},
				{Key: "totalAmount", Value: bson.D{{Key: "$sum", Value: "$amount"}}},
			}}},
		}
	} else {
		// Otherwise, match inside app_costs
		pipeline = mongo.Pipeline{
			{{Key: "$match", Value: subConsumptionMatch}},
			{{Key: "$unwind", Value: "$app_costs"}},
			{{Key: "$match", Value: bson.D{
				{Key: "app_costs.name", Value: appName},
			}}},
			{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: nil},
				{Key: "totalAmount", Value: bson.D{{Key: "$sum", Value: "$app_costs.amount"}}},
			}}},
		}
	}

	cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return 0, fmt.Errorf("failed to execute aggregate query: %w", err)
	}
	defer cursor.Close(context.Background())

	var result struct {
		TotalAmount int64 `bson:"totalAmount"`
	}

	if cursor.Next(context.Background()) {
		if err := cursor.Decode(&result); err != nil {
			return 0, fmt.Errorf("failed to decode aggregate result: %w", err)
		}
	} else {
		return 0, fmt.Errorf("no records found")
	}

	return result.TotalAmount, nil
}

func (m *MongoDB) GetCostAppList(req helper.GetCostAppListReq) (resp helper.CostAppListResp, rErr error) {
	if req.PageSize <= 0 {
		req.PageSize = 10
	}
	if req.Page <= 0 {
		req.Page = 1
	}
	pageSize := req.PageSize
	if strings.ToUpper(req.AppType) != resources.AppStore {
		match := bson.M{
			"owner":    req.Owner,
			"type":     accountv1.Consumption,
			"app_type": bson.M{"$ne": resources.AppType[resources.AppStore]},
		}
		if req.Namespace != "" {
			match["namespace"] = req.Namespace
		}
		if req.AppType != "" {
			match["app_type"] = resources.AppType[strings.ToUpper(req.AppType)]
		}
		if req.StartTime.IsZero() {
			req.StartTime = time.Now().UTC().Add(-time.Hour * 24 * 30)
			req.EndTime = time.Now().UTC()
		}
		match["time"] = bson.M{
			"$gte": req.StartTime,
			"$lte": req.EndTime,
		}

		pipeline := mongo.Pipeline{
			{{Key: "$match", Value: match}},
			{{Key: "$facet", Value: bson.D{
				{Key: "withAppCosts", Value: bson.A{
					bson.D{{Key: "$match", Value: bson.D{{Key: "app_costs", Value: bson.M{"$exists": true}}}}},
					bson.D{{Key: "$unwind", Value: "$app_costs"}},
					bson.D{{Key: "$group", Value: bson.D{
						{Key: "_id", Value: bson.D{
							{Key: "app_type", Value: "$app_type"},
							{Key: "app_name", Value: "$app_costs.name"},
							{Key: "namespace", Value: "$namespace"},
							{Key: "owner", Value: "$owner"},
						}},
					}}},
				}},
				{Key: "withoutAppCosts", Value: bson.A{
					bson.D{{Key: "$match", Value: bson.D{
						{Key: "app_costs", Value: bson.M{"$exists": false}},
						{Key: "app_name", Value: bson.M{"$exists": true}},
					}}},
					bson.D{{Key: "$group", Value: bson.D{
						{Key: "_id", Value: bson.D{
							{Key: "app_type", Value: "$app_type"},
							{Key: "app_name", Value: "$app_name"},
							{Key: "namespace", Value: "$namespace"},
							{Key: "owner", Value: "$owner"},
						}},
					}}},
				}},
			}}},
			{{Key: "$project", Value: bson.D{
				{Key: "combined", Value: bson.D{{Key: "$concatArrays", Value: bson.A{"$withAppCosts", "$withoutAppCosts"}}}},
			}}},
			{{Key: "$unwind", Value: "$combined"}},
			{{Key: "$replaceRoot", Value: bson.D{{Key: "newRoot", Value: "$combined._id"}}}},
		}

		if req.AppName != "" {
			pipeline = append(pipeline, bson.D{{Key: "$match", Value: bson.D{
				{Key: "app_name", Value: req.AppName},
			}}})
		}

		pipeline = append(pipeline, bson.D{
			{Key: "$project", Value: bson.D{
				{Key: "_id", Value: 0},
				{Key: "namespace", Value: "$namespace"},
				{Key: "appType", Value: "$app_type"},
				{Key: "owner", Value: "$owner"},
				{Key: "appName", Value: "$app_name"},
			}},
		})

		pipeline = append(pipeline, bson.D{{Key: "$sort", Value: bson.D{
			{Key: "appName", Value: 1},
			{Key: "appType", Value: -1},
			{Key: "namespace", Value: 1},
			{Key: "amount", Value: 1},
		}}})

		countPipeline := append(pipeline, bson.D{{Key: "$count", Value: "total"}})
		countCursor, err := m.getBillingCollection().Aggregate(context.Background(), countPipeline)
		if err != nil {
			return resp, fmt.Errorf("failed to execute count aggregate query: %w", err)
		}
		defer countCursor.Close(context.Background())

		if countCursor.Next(context.Background()) {
			var countResult struct {
				Total int64 `bson:"total"`
			}
			if err := countCursor.Decode(&countResult); err != nil {
				return resp, fmt.Errorf("failed to decode count result: %w", err)
			}
			resp.Total = countResult.Total
		}
		pipeline = append(pipeline,
			bson.D{{Key: "$skip", Value: (req.Page - 1) * pageSize}},
			bson.D{{Key: "$limit", Value: pageSize}},
		)

		cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
		if err != nil {
			return resp, fmt.Errorf("failed to execute aggregate query: %w", err)
		}
		defer cursor.Close(context.Background())

		var result []helper.CostApp
		if err := cursor.All(context.Background(), &result); err != nil {
			return resp, fmt.Errorf("failed to decode all billing record: %w", err)
		}
		resp.Apps = result
	}
	appStoreTotal, err := m.getAppStoreTotal(req)
	if err != nil {
		return resp, fmt.Errorf("failed to get app store total: %w", err)
	}

	if req.AppType == "" || strings.ToUpper(req.AppType) == resources.AppStore {
		currentAppPageIsFull := len(resp.Apps) == req.PageSize
		maxAppPageSize := (resp.Total + int64(req.PageSize) - 1) / int64(req.PageSize)
		completedNum := calculateComplement(int(resp.Total), req.PageSize)
		appPageSize := (resp.Total + int64(req.PageSize) - 1) / int64(req.PageSize)

		if req.Page == int(maxAppPageSize) {
			if !currentAppPageIsFull {
				appStoreResp, err := m.getAppStoreList(req, 0, completedNum)
				if err != nil {
					return resp, fmt.Errorf("failed to get app store list: %w", err)
				}
				resp.Apps = append(resp.Apps, appStoreResp.Apps...)
			}
		} else if req.Page > int(maxAppPageSize) {
			skipPageSize := (req.Page - int(appPageSize) - 1) * req.PageSize
			if skipPageSize < 0 {
				skipPageSize = 0
			}
			appStoreResp, err := m.getAppStoreList(req, completedNum+skipPageSize, req.PageSize)
			if err != nil {
				return resp, fmt.Errorf("failed to get app store list: %w", err)
			}
			resp.Apps = append(resp.Apps, appStoreResp.Apps...)
		}
		resp.Total += appStoreTotal
	}

	resp.TotalPage = (resp.Total + int64(pageSize) - 1) / int64(pageSize)
	return resp, nil
}

func calculateComplement(a, b int) int {
	remainder := a % b
	if remainder == 0 {
		return 0
	}
	return b - remainder
}

func (m *MongoDB) executeCountQuery(ctx context.Context, pipeline []bson.M) (int64, error) {
	countCursor, err := m.getBillingCollection().Aggregate(ctx, pipeline)
	if err != nil {
		return 0, fmt.Errorf("failed to execute count aggregate query: %w", err)
	}
	defer countCursor.Close(ctx)

	var countResult struct {
		Total int64 `bson:"total"`
	}
	if countCursor.Next(ctx) {
		if err := countCursor.Decode(&countResult); err != nil {
			return 0, fmt.Errorf("failed to decode count result: %w", err)
		}
	}
	return countResult.Total, nil
}

// GetBasicCostDistribution cost: map[string]int64: key: property type (cpu,memory,storage,network,nodeport: 0,1,2,3,4), value: used amount
func (m *MongoDB) GetBasicCostDistribution(req helper.GetCostAppListReq) (map[string]int64, error) {
	cost := make(map[string]int64, len(resources.DefaultPropertyTypeLS.EnumMap))
	for i := range resources.DefaultPropertyTypeLS.EnumMap {
		cost[strconv.Itoa(int(i))] = 0
	}

	match := buildMatchCriteria(req)
	groupStage := buildGroupStage()
	projectStage := buildProjectStage()

	if req.AppType == "" || strings.ToUpper(req.AppType) != resources.AppStore {
		if err := aggregateAndUpdateCost(m, match, groupStage, projectStage, req.AppName, cost); err != nil {
			return nil, err
		}
	}

	if req.AppType == "" || strings.ToUpper(req.AppType) == resources.AppStore {
		match["app_type"] = resources.AppType[resources.AppStore]
		delete(match, "app_costs.name")
		if req.AppName != "" {
			match["app_name"] = req.AppName
		}
		if err := aggregateAndUpdateCost(m, match, groupStage, projectStage, "", cost); err != nil {
			return nil, err
		}
	}
	return cost, nil
}

func (m *MongoDB) GetAppCostTimeRange(req helper.GetCostAppListReq) (helper.TimeRange, error) {
	match := buildMatchCriteria(req)
	delete(match, "time") // Remove time constraint from match criteria

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: match}},
		{{Key: "$unwind", Value: "$app_costs"}},
	}

	if req.AppName != "" {
		pipeline = append(pipeline, bson.D{{Key: "$match", Value: bson.M{"app_costs.name": req.AppName}}})
	}

	pipeline = append(pipeline,
		bson.D{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: nil},
			{Key: "startTime", Value: bson.D{{Key: "$min", Value: "$time"}}},
			{Key: "endTime", Value: bson.D{{Key: "$max", Value: "$time"}}},
		}}},
	)

	cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return helper.TimeRange{}, fmt.Errorf("failed to execute aggregate query: %w", err)
	}
	defer cursor.Close(context.Background())

	var result helper.TimeRange
	if cursor.Next(context.Background()) {
		if err := cursor.Decode(&result); err != nil {
			return helper.TimeRange{}, fmt.Errorf("failed to decode aggregate result: %w", err)
		}
	} else {
		return helper.TimeRange{}, fmt.Errorf("no records found")
	}

	// If the app type is empty or app store, also check the app store records
	if req.AppType == "" || strings.ToUpper(req.AppType) == resources.AppStore {
		match["app_type"] = resources.AppType[resources.AppStore]
		delete(match, "app_costs.name")
		if req.AppName != "" {
			match["app_name"] = req.AppName
		}

		pipeline := mongo.Pipeline{
			{{Key: "$match", Value: match}},
			{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: nil},
				{Key: "startTime", Value: bson.D{{Key: "$min", Value: "$time"}}},
				{Key: "endTime", Value: bson.D{{Key: "$max", Value: "$time"}}},
			}}},
		}

		cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
		if err != nil {
			return helper.TimeRange{}, fmt.Errorf("failed to execute aggregate query for app store: %w", err)
		}
		defer cursor.Close(context.Background())

		var appStoreResult helper.TimeRange
		if cursor.Next(context.Background()) {
			if err := cursor.Decode(&appStoreResult); err != nil {
				return helper.TimeRange{}, fmt.Errorf("failed to decode aggregate result for app store: %w", err)
			}

			// Update the overall time range if necessary
			if appStoreResult.StartTime.Before(result.StartTime) {
				result.StartTime = appStoreResult.StartTime
			}
			if appStoreResult.EndTime.After(result.EndTime) {
				result.EndTime = appStoreResult.EndTime
			}
		}
	}

	return result, nil
}

func buildMatchCriteria(req helper.GetCostAppListReq) bson.M {
	match := bson.M{
		"owner":    req.Owner,
		"app_type": bson.M{"$ne": resources.AppType[resources.AppStore]},
	}
	if req.Namespace != "" {
		match["namespace"] = req.Namespace
	}
	if req.AppType != "" {
		match["app_type"] = resources.AppType[strings.ToUpper(req.AppType)]
	}
	if req.AppName != "" {
		match["app_costs.name"] = req.AppName
	}
	if req.StartTime.IsZero() {
		req.StartTime = time.Now().UTC().Add(-time.Hour * 24 * 30)
		req.EndTime = time.Now().UTC()
	}
	match["time"] = bson.M{
		"$gte": req.StartTime,
		"$lte": req.EndTime,
	}
	return match
}

func buildGroupStage() bson.D {
	groupFields := bson.D{}
	for i := range resources.DefaultPropertyTypeLS.EnumMap {
		key := fmt.Sprintf("used_amount_%d", i)
		field := fmt.Sprintf("$app_costs.used_amount.%d", i)
		groupFields = append(groupFields, bson.E{
			Key: key, Value: bson.D{
				{Key: "$sum", Value: bson.D{
					{Key: "$ifNull", Value: bson.A{bson.D{{Key: "$toLong", Value: field}}, 0}},
				}},
			},
		})
	}
	return bson.D{{Key: "$group", Value: append(bson.D{{Key: "_id", Value: nil}}, groupFields...)}}
}

func buildProjectStage() bson.D {
	projectFields := bson.D{}
	for i := range resources.DefaultPropertyTypeLS.EnumMap {
		key := fmt.Sprintf("used_amount.%d", i)
		field := fmt.Sprintf("$used_amount_%d", i)
		projectFields = append(projectFields, bson.E{Key: key, Value: field})
	}
	return bson.D{{Key: "$project", Value: projectFields}}
}

func aggregateAndUpdateCost(m *MongoDB, match bson.M, groupStage, projectStage bson.D, appName string, cost map[string]int64) error {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: match}},
		{{Key: "$unwind", Value: "$app_costs"}},
	}
	if appName != "" {
		pipeline = append(pipeline, bson.D{{Key: "$match", Value: bson.M{"app_costs.name": appName}}})
	}
	pipeline = append(pipeline, groupStage, projectStage)

	cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return fmt.Errorf("failed to execute aggregate query: %w", err)
	}
	defer cursor.Close(context.Background())

	var result struct {
		UsedAmount map[string]int64 `bson:"used_amount"`
	}
	if cursor.Next(context.Background()) {
		if err := cursor.Decode(&result); err != nil {
			return fmt.Errorf("failed to decode aggregate result: %w", err)
		}
		for i, v := range result.UsedAmount {
			cost[i] += v
		}
	}
	return nil
}

func (m *MongoDB) getAppPipeLine(req helper.GetCostAppListReq) []bson.M {
	match := bson.M{
		"owner":    req.Owner,
		"app_type": resources.AppType[resources.AppStore],
	}
	if req.Namespace != "" {
		match["namespace"] = req.Namespace
	}
	if req.AppName != "" {
		match["app_name"] = req.AppName
	}
	if !req.StartTime.IsZero() {
		match["time"] = bson.M{
			"$gte": req.StartTime,
			"$lte": req.EndTime,
		}
	}

	pipeline := []bson.M{
		{"$match": match},
		{"$unwind": "$app_costs"},
		{"$sort": bson.M{
			"time": -1,
		}},
		{"$group": bson.M{
			"_id": bson.M{
				"namespace": "$namespace",
				"app_type":  "$app_type",
				"owner":     "$owner",
				"app_name":  "$app_name",
			},
		}},
		{"$project": bson.M{
			"_id":       0,
			"namespace": "$_id.namespace",
			"appType":   "$_id.app_type",
			"owner":     "$_id.owner",
			"appName":   "$_id.app_name",
		}},
	}
	return pipeline
}

func (m *MongoDB) getAppStoreTotal(req helper.GetCostAppListReq) (int64, error) {
	return m.executeCountQuery(context.Background(), append(m.getAppPipeLine(req), bson.M{"$count": "total"}))
}

func (m *MongoDB) getAppStoreList(req helper.GetCostAppListReq, skip, pageSize int) (resp helper.CostAppListResp, rErr error) {
	pipeline := m.getAppPipeLine(req)
	skipStage := bson.M{"$skip": skip}
	limitStage := bson.M{"$limit": pageSize}
	limitPipeline := append(pipeline, skipStage, limitStage)

	resp.Total, rErr = m.executeCountQuery(context.Background(), append(m.getAppPipeLine(req), bson.M{"$count": "total"}))
	if rErr != nil {
		rErr = fmt.Errorf("failed to execute count aggregate query: %w", rErr)
		return
	}
	if req.PageSize > 0 {
		resp.TotalPage = (resp.Total + int64(req.PageSize) - 1) / int64(req.PageSize)
	}

	if req.PageSize > 0 {
		cursor, err := m.getBillingCollection().Aggregate(context.Background(), limitPipeline)
		if err != nil {
			rErr = fmt.Errorf("failed to execute aggregate query: %w", err)
			return
		}
		defer cursor.Close(context.Background())

		var result []helper.CostApp
		if err = cursor.All(context.Background(), &result); err != nil {
			rErr = fmt.Errorf("failed to decode all billing record: %w", err)
			return
		}
		resp.Apps = result
	}
	return
}

func (m *Account) Disconnect(ctx context.Context) error {
	if m == nil {
		return nil
	}
	if m.MongoDB != nil && m.MongoDB.Client != nil {
		if err := m.MongoDB.Client.Disconnect(ctx); err != nil {
			return fmt.Errorf("failed to close mongodb client: %v", err)
		}
	}
	if m.Cockroach != nil && m.Cockroach.ck != nil {
		if err := m.ck.Close(); err != nil {
			return fmt.Errorf("failed to close cockroach client: %v", err)
		}
	}
	return nil
}

func (m *MongoDB) GetConsumptionAmount(req helper.ConsumptionRecordReq) (int64, error) {
	owner, namespace, appType, appName, startTime, endTime := req.Owner, req.Namespace, req.AppType, req.AppName, req.TimeRange.StartTime, req.TimeRange.EndTime
	timeMatchValue := bson.D{primitive.E{Key: "$gte", Value: startTime}, primitive.E{Key: "$lte", Value: endTime}}
	matchValue := bson.D{
		primitive.E{Key: "time", Value: timeMatchValue},
		primitive.E{Key: "owner", Value: owner},
	}
	if appType != "" {
		matchValue = append(matchValue, primitive.E{Key: "app_type", Value: resources.AppType[strings.ToUpper(appType)]})
	}
	if namespace != "" {
		matchValue = append(matchValue, primitive.E{Key: "namespace", Value: namespace})
	}
	unwindMatchValue := bson.D{
		primitive.E{Key: "time", Value: timeMatchValue},
	}
	if appType != "" && appName != "" {
		if appType != resources.AppStore {
			unwindMatchValue = append(unwindMatchValue, primitive.E{Key: "app_costs.name", Value: appName})
		} else {
			unwindMatchValue = append(unwindMatchValue, primitive.E{Key: "app_name", Value: appName})
		}
	}
	pipeline := bson.A{
		bson.D{{Key: "$match", Value: matchValue}},
		bson.D{{Key: "$unwind", Value: "$app_costs"}},
		bson.D{{Key: "$match", Value: unwindMatchValue}},
		bson.D{{Key: "$group", Value: bson.M{
			"_id":   nil,
			"total": bson.M{"$sum": "$app_costs.amount"},
		}}},
	}

	cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return 0, fmt.Errorf("failed to aggregate billing collection: %v", err)
	}
	defer cursor.Close(context.Background())

	var result struct {
		Total int64 `bson:"total"`
	}

	if cursor.Next(context.Background()) {
		if err := cursor.Decode(&result); err != nil {
			return 0, fmt.Errorf("failed to decode result: %v", err)
		}
	}
	return result.Total, nil
}

func (m *MongoDB) GetPropertiesUsedAmount(user string, startTime, endTime time.Time) (map[string]int64, error) {
	propertiesUsedAmount := make(map[string]int64)
	for _, property := range m.Properties.Types {
		amount, err := m.getSumOfUsedAmount(property.Enum, user, startTime, endTime)
		if err != nil {
			return nil, fmt.Errorf("failed to get sum of used amount: %v", err)
		}
		propertiesUsedAmount[property.Name] = amount
	}
	return propertiesUsedAmount, nil
}

func (m *MongoDB) getSumOfUsedAmount(propertyType uint8, user string, startTime, endTime time.Time) (int64, error) {
	pipeline := bson.A{
		bson.D{{Key: "$match", Value: bson.M{
			"time":                    bson.M{"$gte": startTime, "$lte": endTime},
			"owner":                   user,
			"app_costs.used_amount.0": bson.M{"$exists": true},
		}}},
		bson.D{{Key: "$unwind", Value: "$app_costs"}},
		bson.D{{Key: "$group", Value: bson.M{
			"_id":         nil,
			"totalAmount": bson.M{"$sum": "$app_costs.used_amount." + strconv.Itoa(int(propertyType))},
		}}},
	}
	cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return 0, fmt.Errorf("failed to get billing collection: %v", err)
	}
	defer cursor.Close(context.Background())
	var result struct {
		TotalAmount int64 `bson:"totalAmount"`
	}

	if cursor.Next(context.Background()) {
		if err := cursor.Decode(&result); err != nil {
			return 0, fmt.Errorf("failed to decode result: %v", err)
		}
	}
	return result.TotalAmount, nil
}

func (m *MongoDB) GetMonitorUniqueValues(startTime, endTime time.Time, namespaces []string) ([]common.Monitor, error) {
	ctx := context.Background()
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"time": bson.M{
				"$gte": startTime,
				"$lte": endTime,
			},
			"category": bson.M{
				"$in": namespaces,
			},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{
				"category":    "$category",
				"parent_type": "$parent_type",
				"parent_name": "$parent_name",
				"type":        "$type",
				"name":        "$name",
			},
		}}},
		{{Key: "$project", Value: bson.M{
			"_id":         0,
			"namespace":   "$_id.category",
			"parent_type": "$_id.parent_type",
			"parent_name": "$_id.parent_name",
			"type":        "$_id.type",
			"name":        "$_id.name",
		}}},
	}

	cursor, err := m.getMonitorCollection(startTime).Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("aggregate error: %v", err)
	}
	defer cursor.Close(ctx)
	var result []common.Monitor
	if err := cursor.All(ctx, &result); err != nil {
		return nil, fmt.Errorf("cursor error: %v", err)
	}
	return result, nil
}

func NewAccountInterface(mongoURI, globalCockRoachURI, localCockRoachURI string) (Interface, error) {
	client, err := mongo.Connect(context.Background(), options.Client().ApplyURI(mongoURI))
	if err != nil {
		return nil, fmt.Errorf("failed to connect mongodb: %v", err)
	}
	if err = client.Ping(context.Background(), nil); err != nil {
		return nil, fmt.Errorf("failed to ping mongodb: %v", err)
	}
	mongodb := &MongoDB{
		Client:            client,
		AccountDBName:     "sealos-resources",
		BillingConn:       "billing",
		ActiveBillingConn: "active-billing",
		PropertiesConn:    "properties",
	}
	ck, err := cockroach.NewCockRoach(globalCockRoachURI, localCockRoachURI)
	if err != nil {
		return nil, fmt.Errorf("failed to connect cockroach: %v", err)
	}
	account := &Account{MongoDB: mongodb, Cockroach: &Cockroach{ck: ck}}
	if err = account.InitDB(); err != nil {
		return nil, fmt.Errorf("failed to init tables: %v", err)
	}
	return account, nil
}

func newAccountForTest(mongoURI, globalCockRoachURI, localCockRoachURI string) (Interface, error) {
	account := &Account{}
	if mongoURI != "" {
		client, err := mongo.Connect(context.Background(), options.Client().ApplyURI(mongoURI))
		if err != nil {
			return nil, fmt.Errorf("failed to connect mongodb: %v", err)
		}
		if err = client.Ping(context.Background(), nil); err != nil {
			return nil, fmt.Errorf("failed to ping mongodb: %v", err)
		}
		account.MongoDB = &MongoDB{
			Client:            client,
			AccountDBName:     "sealos-resources",
			BillingConn:       "billing",
			ActiveBillingConn: "active-billing",
			PropertiesConn:    "properties",
		}
	} else {
		fmt.Printf("mongoURI is empty, skip connecting to mongodb\n")
	}
	if globalCockRoachURI != "" && localCockRoachURI != "" {
		ck, err := cockroach.NewCockRoach(globalCockRoachURI, localCockRoachURI)
		if err != nil {
			return nil, fmt.Errorf("failed to connect cockroach: %v", err)
		}
		if err = ck.InitTables(); err != nil {
			return nil, fmt.Errorf("failed to init tables: %v", err)
		}
		account.Cockroach = &Cockroach{ck: ck}
	} else {
		fmt.Printf("globalCockRoachURI or localCockRoachURI is empty, skip connecting to cockroach\n")
	}
	return account, nil
}

func (m *MongoDB) getProperties() (*resources.PropertyTypeLS, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	cursor, err := m.getPropertiesCollection().Find(ctx, bson.M{})
	if err != nil {
		return nil, fmt.Errorf("get all prices error: %v", err)
	}
	var properties []resources.PropertyType
	if err = cursor.All(ctx, &properties); err != nil {
		return nil, fmt.Errorf("get all prices error: %v", err)
	}
	if len(properties) != 0 {
		resources.DefaultPropertyTypeLS = resources.NewPropertyTypeLS(properties)
	}
	return resources.DefaultPropertyTypeLS, nil
}

func (m *MongoDB) getPropertiesCollection() *mongo.Collection {
	return m.Client.Database(m.AccountDBName).Collection(m.PropertiesConn)
}

func (m *Account) GetBillingHistoryNamespaceList(req *helper.NamespaceBillingHistoryReq) ([][]string, error) {
	filter := bson.M{
		"owner": req.Owner,
	}
	if req.StartTime != req.EndTime {
		filter["time"] = bson.M{
			"$gte": req.StartTime.UTC(),
			"$lte": req.EndTime.UTC(),
		}
	}
	if req.Type != -1 {
		filter["type"] = req.Type
	}

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: filter}},
		{{Key: "$group", Value: bson.D{{Key: "_id", Value: nil}, {Key: "namespaces", Value: bson.D{{Key: "$addToSet", Value: "$namespace"}}}}}},
	}

	cur, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, err
	}
	defer cur.Close(context.Background())

	if !cur.Next(context.Background()) {
		return [][]string{}, nil
	}

	var result struct {
		Namespaces []string `bson:"namespaces"`
	}
	if err := cur.Decode(&result); err != nil {
		return nil, err
	}
	return m.GetWorkspaceName(result.Namespaces)
}

func (m *MongoDB) getBillingCollection() *mongo.Collection {
	return m.Client.Database(m.AccountDBName).Collection(m.BillingConn)
}

func (m *MongoDB) getMonitorCollection(collTime time.Time) *mongo.Collection {
	// 2020-12-01 00:00:00 - 2020-12-01 23:59:59
	return m.Client.Database(m.AccountDBName).Collection(m.getMonitorCollectionName(collTime))
}

func (m *MongoDB) getActiveBillingCollection() *mongo.Collection {
	return m.Client.Database(m.AccountDBName).Collection(m.ActiveBillingConn)
}

func (m *MongoDB) getMonitorCollectionName(collTime time.Time) string {
	// Calculate the suffix by day, for example, the suffix on the first day of 202012 is 20201201
	return fmt.Sprintf("%s_%s", "monitor", collTime.Format("20060102"))
}

func (m *Account) ApplyInvoice(req *helper.ApplyInvoiceReq) (invoice types.Invoice, payments []types.Payment, err error) {
	if len(req.PaymentIDList) == 0 {
		return
	}
	payments, err = m.ck.GetUnInvoicedPaymentListWithIds(req.PaymentIDList)
	if err != nil {
		err = fmt.Errorf("failed to get payment list: %v", err)
		return
	}
	if len(payments) == 0 {
		return
	}
	amount := int64(0)
	var paymentIDs []string
	var invoicePayments []types.InvoicePayment
	id, err := gonanoid.New(12)
	if err != nil {
		err = fmt.Errorf("failed to generate payment id: %v", err)
		return
	}
	for i := range payments {
		amount += payments[i].Amount
		paymentIDs = append(paymentIDs, payments[i].ID)
		invoicePayments = append(invoicePayments, types.InvoicePayment{
			PaymentID: payments[i].ID,
			Amount:    payments[i].Amount,
			InvoiceID: id,
		})
	}
	invoice = types.Invoice{
		ID:          id,
		UserID:      req.UserID,
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
		Detail:      req.Detail,
		TotalAmount: amount,
		Status:      types.PendingInvoiceStatus,
	}
	// save invoice with transaction
	if err = m.ck.DB.Transaction(
		func(tx *gorm.DB) error {
			if err = m.ck.SetPaymentInvoiceWithDB(&types.UserQueryOpts{ID: req.UserID}, paymentIDs, tx); err != nil {
				return fmt.Errorf("failed to set payment invoice: %v", err)
			}
			if err = m.ck.CreateInvoiceWithDB(&invoice, tx); err != nil {
				return fmt.Errorf("failed to create invoice: %v", err)
			}
			if err = m.ck.CreateInvoicePaymentsWithDB(invoicePayments, tx); err != nil {
				return fmt.Errorf("failed to create invoice payments: %v", err)
			}
			return nil
		}); err != nil {
		err = fmt.Errorf("failed to apply invoice: %v", err)
		return
	}
	return
}

func (m *Account) GetInvoice(req *helper.GetInvoiceReq) ([]types.Invoice, types.LimitResp, error) {
	if req.InvoiceID != "" {
		invoice, err := m.ck.GetInvoiceWithID(req.InvoiceID)
		if err != nil {
			return nil, types.LimitResp{}, fmt.Errorf("failed to get invoice: %v", err)
		}
		return []types.Invoice{*invoice}, types.LimitResp{Total: 1, TotalPage: 1}, nil
	}
	return m.ck.GetInvoice(req.UserID, types.LimitReq{
		Page:     req.Page,
		PageSize: req.PageSize,
		TimeRange: types.TimeRange{
			StartTime: req.StartTime,
			EndTime:   req.EndTime,
		},
	})
}

func (m *Account) GetInvoicePayments(invoiceID string) ([]types.Payment, error) {
	return m.ck.GetPaymentWithInvoice(invoiceID)
}

func (m *Account) SetStatusInvoice(req *helper.SetInvoiceStatusReq) error {
	return m.ck.SetInvoiceStatus(req.InvoiceIDList, req.Status)
}

func (m *Account) UseGiftCode(req *helper.UseGiftCodeReq) (*types.GiftCode, error) {
	giftCode, err := m.ck.GetGiftCodeWithCode(req.Code)
	if err != nil {
		return nil, fmt.Errorf("failed to get gift code: %v", err)
	}

	if !giftCode.ExpiredAt.IsZero() && time.Now().After(giftCode.ExpiredAt) {
		return nil, fmt.Errorf("gift code has expired")
	}

	if giftCode.Used {
		return nil, fmt.Errorf("gift code is already used")
	}

	if err = m.ck.UseGiftCode(giftCode, req.UserID); err != nil {
		return nil, fmt.Errorf("failed to use gift code: %v", err)
	}

	return giftCode, nil
}

func (m *Account) GetRechargeDiscount(req helper.AuthReq) (helper.RechargeDiscountResp, error) {
	userQuery := &types.UserQueryOpts{UID: req.GetAuth().UserUID}
	userDiscount, err := m.ck.GetUserRechargeDiscount(userQuery)
	if err != nil {
		return helper.RechargeDiscountResp{}, fmt.Errorf("failed to get user recharge discount: %v", err)
	}
	return helper.RechargeDiscountResp{
		DefaultSteps:       userDiscount.DefaultSteps,
		FirstRechargeSteps: userDiscount.FirstRechargeSteps,
	}, nil
}

func (m *Account) ProcessPendingTaskRewards() error {
	return m.ck.ProcessPendingTaskRewards()
}

func (m *Account) GetUserRealNameInfo(req *helper.GetRealNameInfoReq) (*types.UserRealNameInfo, error) {
	// get user info
	userRealNameInfo, err := m.ck.GetUserRealNameInfoByUserID(req.UserID)

	if err != nil {
		return nil, err
	}

	return userRealNameInfo, nil
}

func (m *Account) GetEnterpriseRealNameInfo(req *helper.GetRealNameInfoReq) (*types.EnterpriseRealNameInfo, error) {
	// get enterprise info
	enterpriseRealNameInfo, err := m.ck.GetEnterpriseRealNameInfoByUserID(req.UserID)

	if err != nil {
		return nil, err
	}

	return enterpriseRealNameInfo, nil
}

func (m *Account) ReconcileActiveBilling(startTime, endTime time.Time) error {
	ctx := context.Background()
	billings := make(map[uuid.UUID]*billingBatch)

	// Process billings in batches
	if err := m.processBillingBatches(ctx, startTime, endTime, billings); err != nil {
		helper.ErrorCounter.WithLabelValues("ReconcileActiveBilling", "processBillingBatches", "").Inc()
		return fmt.Errorf("failed to process billing batches: %w", err)
	}

	// Handle each user's billings
	for uid, batch := range billings {
		if err := m.reconcileUserBilling(ctx, uid, batch); err != nil {
			helper.ErrorCounter.WithLabelValues("ReconcileActiveBilling", "reconcileUserBilling", uid.String()).Inc()
			logrus.Errorf("failed to reconcile billing for user %s: %v", uid, err)
			continue
		}
	}

	return nil
}

type billingBatch struct {
	IDs    []primitive.ObjectID
	Amount int64
}

func (m *Account) processBillingBatches(ctx context.Context, startTime, endTime time.Time, billings map[uuid.UUID]*billingBatch) error {
	filter := bson.M{
		"time": bson.M{
			"$gte": startTime,
			"$lte": endTime,
		},
		"status": bson.M{"$nin": []resources.ConsumptionStatus{
			resources.Processing,
			resources.Consumed,
		}},
	}

	for {
		var billing resources.ActiveBilling
		err := m.MongoDB.getActiveBillingCollection().FindOneAndUpdate(
			ctx,
			filter,
			bson.M{"$set": bson.M{"status": resources.Processing}},
			options.FindOneAndUpdate().
				SetReturnDocument(options.After).
				SetSort(bson.M{"time": 1}),
		).Decode(&billing)

		if err == mongo.ErrNoDocuments {
			break
		}
		// TODO error handling
		if err != nil {
			logrus.Errorf("failed to find and update billing: %v", err)
			continue
		}

		batch, ok := billings[billing.UserUID]
		if !ok {
			batch = &billingBatch{
				IDs:    make([]primitive.ObjectID, 0),
				Amount: 0,
			}
			billings[billing.UserUID] = batch
		}
		batch.IDs = append(batch.IDs, billing.ID)
		batch.Amount += billing.Amount
	}

	return nil
}

func (m *Account) reconcileUserBilling(ctx context.Context, uid uuid.UUID, batch *billingBatch) error {
	return m.ck.DB.Transaction(func(tx *gorm.DB) error {
		// Deduct balance
		if err := m.ck.AddDeductionBalanceWithDB(&types.UserQueryOpts{UID: uid}, batch.Amount, tx); err != nil {
			return fmt.Errorf("failed to deduct balance: %w", err)
		}

		// Update billing status
		_, err := m.MongoDB.getActiveBillingCollection().UpdateMany(
			ctx,
			bson.M{"_id": bson.M{"$in": batch.IDs}},
			bson.M{"$set": bson.M{"status": resources.Consumed}},
		)
		if err != nil {
			return fmt.Errorf("failed to update billing status: %w", err)
		}

		return nil
	})
}

func (m *Account) ChargeBilling(req *helper.AdminChargeBillingReq) error {
	billing := &resources.ActiveBilling{
		Namespace: req.Namespace,
		AppType:   req.AppType,
		AppName:   req.AppName,
		Amount:    req.Amount,
		//Owner:     userCr.CrName,
		Time:    time.Now().UTC(),
		Status:  resources.Unconsumed,
		UserUID: req.UserUID,
	}
	err := m.MongoDB.SaveActiveBillings(billing)
	if err != nil {
		return fmt.Errorf("save active monitor failed: %v", err)
	}
	return nil
}

func (m *Account) ActiveBilling(req resources.ActiveBilling) error {
	return m.ck.DB.Transaction(func(tx *gorm.DB) error {
		if err := m.ck.AddDeductionBalanceWithDB(&types.UserQueryOpts{UID: req.UserUID}, req.Amount, tx); err != nil {
			helper.ErrorCounter.WithLabelValues("ActiveBilling", "AddDeductionBalanceWithDB", req.UserUID.String()).Inc()
			return fmt.Errorf("failed to deduct balance: %v", err)
		}
		req.Status = resources.Consumed
		_, err := m.getActiveBillingCollection().InsertOne(context.Background(), req)
		if err != nil {
			helper.ErrorCounter.WithLabelValues("ActiveBilling", "InsertOne", req.UserUID.String()).Inc()
			return fmt.Errorf("failed to insert (%v) monitor: %v", req, err)
		}
		return nil
	})
}

func (m *MongoDB) UpdateBillingStatus(orderID string, status resources.BillingStatus) error {
	filter := bson.M{"order_id": orderID}
	update := bson.M{
		"$set": bson.M{
			"status": status,
		},
	}
	_, err := m.getBillingCollection().UpdateOne(context.Background(), filter, update)
	if err != nil {
		return fmt.Errorf("update error: %v", err)
	}
	return nil
}

func (m *Account) ReconcileUnsettledLLMBilling(startTime, endTime time.Time) error {
	unsettledAmounts, err := m.MongoDB.reconcileUnsettledLLMBilling(startTime, endTime)
	if err != nil {
		return fmt.Errorf("failed to get unsettled billing: %v", err)
	}
	for userUID, amount := range unsettledAmounts {
		err = m.ck.DB.Transaction(func(tx *gorm.DB) error {
			// 1. deduct balance
			if err := m.ck.AddDeductionBalanceWithDB(&types.UserQueryOpts{UID: userUID}, amount, tx); err != nil {
				return fmt.Errorf("failed to deduct balance: %v", err)
			}
			// 2. update billing status
			filter := bson.M{
				"user_uid": userUID,
				"type":     accountv1.SubConsumption,
				"status":   resources.Unsettled,
				"app_type": resources.AppType[resources.LLMToken],
				"time": bson.M{
					"$gte": startTime,
					"$lte": endTime,
				},
			}
			update := bson.M{
				"$set": bson.M{
					"status": resources.Settled,
				},
			}

			_, err = m.MongoDB.getBillingCollection().UpdateMany(context.Background(), filter, update)
			if err != nil {
				return fmt.Errorf("failed to update billing status: %v", err)
			}

			return nil
		})

		// If the transaction fails, roll back the billing state
		//if err != nil {
		//	err = fmt.Errorf("failed to reconcile billing for user %s: %v", userUID, err)
		//	filter := bson.M{
		//		"user_uid": userUID,
		//		"app_type": resources.AppType["LLM-TOKEN"],
		//		"time": bson.M{
		//			"$gte": time.Now().Add(-time.Hour),
		//		},
		//	}
		//	update := bson.M{
		//		"$set": bson.M{
		//			"status": resources.Unsettled,
		//		},
		//	}
		//	if _, rollBackErr := m.MongoDB.getBillingCollection().UpdateMany(context.Background(), filter, update); rollBackErr != nil {
		//		return fmt.Errorf("%v; And failed to rollback billing status: %v", err, rollBackErr)
		//	}
		//	return err
		//}
		if err != nil {
			return fmt.Errorf("failed to reconcile billing for user %s: %v", userUID, err)
		}
	}
	return nil
}

func (m *Account) ArchiveHourlyBilling(hourStart, hourEnd time.Time) error {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"time": bson.M{
				"$gte": hourStart,
				"$lt":  hourEnd,
			},
			"status": resources.Consumed,
		}}},
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{
				"user_uid": "$user_uid",
				"app_type": "$app_type",
				"app_name": "$app_name",
				//"owner":     "$owner",
				"namespace": "$namespace",
			},
			"total_amount": bson.M{"$sum": "$amount"},
		}}},
	}

	cursor, err := m.MongoDB.getActiveBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		helper.ErrorCounter.WithLabelValues("ArchiveHourlyBilling", "Aggregate", "").Inc()
		return fmt.Errorf("failed to aggregate hourly billing: %v", err)
	}
	defer cursor.Close(context.Background())

	var errs []error
	for cursor.Next(context.Background()) {
		var result struct {
			ID struct {
				UserUID   uuid.UUID `bson:"user_uid"`
				AppName   string    `bson:"app_name"`
				AppType   string    `bson:"app_type"`
				Owner     string    `bson:"owner,omitempty"`
				Namespace string    `bson:"namespace"`
			} `bson:"_id"`
			TotalAmount int64 `bson:"total_amount"`
		}

		if err := cursor.Decode(&result); err != nil {
			errs = append(errs, fmt.Errorf("failed to decode document: %v", err))
			continue
		}
		if result.ID.Owner == "" {
			userCr, err := m.ck.GetUserCr(&types.UserQueryOpts{UID: result.ID.UserUID})
			if err != nil {
				helper.ErrorCounter.WithLabelValues("ArchiveHourlyBilling", "GetUserCr", result.ID.UserUID.String()).Inc()
				errs = append(errs, fmt.Errorf("failed to get user cr: %v", err))
				continue
			}
			result.ID.Owner = userCr.CrName
		}

		filter := bson.M{
			"app_type":  resources.AppType[result.ID.AppType],
			"app_name":  result.ID.AppName,
			"namespace": result.ID.Namespace,
			"owner":     result.ID.Owner,
			"time":      hourStart,
			"type":      accountv1.Consumption,
		}

		billing := bson.M{
			"order_id":  gonanoid.Must(12),
			"type":      accountv1.Consumption,
			"namespace": result.ID.Namespace,
			"app_type":  resources.AppType[result.ID.AppType],
			"app_name":  result.ID.AppName,
			"amount":    result.TotalAmount,
			"owner":     result.ID.Owner,
			"time":      hourStart,
			"status":    resources.Settled,
			"user_uid":  result.ID.UserUID,
		}

		update := bson.M{
			"$setOnInsert": billing,
		}

		opts := options.Update().SetUpsert(true)
		_, err = m.MongoDB.getBillingCollection().UpdateOne(
			context.Background(),
			filter,
			update,
			opts,
		)
		if err != nil {
			helper.ErrorCounter.WithLabelValues("ArchiveHourlyBilling", "UpdateOne", result.ID.UserUID.String()).Inc()
			errs = append(errs, fmt.Errorf("failed to upsert billing for user %s, app %s: %v",
				result.ID.UserUID, result.ID.AppName, err))
			continue
		}
	}
	if err = cursor.Err(); err != nil {
		errs = append(errs, fmt.Errorf("cursor error: %v", err))
	}
	if len(errs) > 0 {
		return fmt.Errorf("encountered %d errors during archiving: %v", len(errs), errs)
	}
	return nil
}

func (m *MongoDB) reconcileUnsettledLLMBilling(startTime, endTime time.Time) (map[uuid.UUID]int64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"time": bson.M{
				"$gte": startTime,
				"$lte": endTime,
			},
			"status":   resources.Unsettled,
			"app_type": resources.AppType[resources.LLMToken],
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":          "$user_uid",
			"total_amount": bson.M{"$sum": "$amount"},
		}}},
	}
	cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate billing: %v", err)
	}
	defer cursor.Close(context.Background())
	result := make(map[uuid.UUID]int64)
	for cursor.Next(context.Background()) {
		var doc struct {
			ID     uuid.UUID `bson:"_id"`
			Amount int64     `bson:"total_amount"`
		}
		if err := cursor.Decode(&doc); err != nil {
			return nil, fmt.Errorf("failed to decode document: %v", err)
		}
		result[doc.ID] = doc.Amount
	}
	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %v", err)
	}
	return result, nil
}
