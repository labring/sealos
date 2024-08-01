package dao

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"github.com/labring/sealos/controllers/pkg/database/cockroach"

	"github.com/labring/sealos/controllers/pkg/types"

	"github.com/labring/sealos/service/account/common"

	"github.com/labring/sealos/controllers/pkg/resources"

	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/labring/sealos/service/account/helper"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type Interface interface {
	GetBillingHistoryNamespaceList(req *helper.NamespaceBillingHistoryReq) ([]string, error)
	GetProperties() ([]common.PropertyQuery, error)
	GetCosts(user string, startTime, endTime time.Time) (common.TimeCostsMap, error)
	GetAppCosts(req *helper.AppCostsReq) (*common.AppCosts, error)
	GetAppCostTimeRange(req helper.GetCostAppListReq) (helper.TimeRange, error)
	GetCostOverview(req helper.GetCostAppListReq) (helper.CostOverviewResp, error)
	GetBasicCostDistribution(req helper.GetCostAppListReq) (map[string]int64, error)
	GetCostAppList(req helper.GetCostAppListReq) (helper.CostAppListResp, error)
	Disconnect(ctx context.Context) error
	GetConsumptionAmount(user, namespace, appType string, startTime, endTime time.Time) (int64, error)
	GetRechargeAmount(ops types.UserQueryOpts, startTime, endTime time.Time) (int64, error)
	GetPropertiesUsedAmount(user string, startTime, endTime time.Time) (map[string]int64, error)
	GetAccount(ops types.UserQueryOpts) (*types.Account, error)
	GetPayment(ops types.UserQueryOpts, startTime, endTime time.Time) ([]types.Payment, error)
	SetPaymentInvoice(req *helper.SetPaymentInvoiceReq) error
	Transfer(req *helper.TransferAmountReq) error
	GetTransfer(ops *types.GetTransfersReq) (*types.GetTransfersResp, error)
	GetUserID(ops types.UserQueryOpts) (string, error)
	GetUserCrName(ops types.UserQueryOpts) (string, error)
	GetRegions() ([]types.Region, error)
	GetLocalRegion() types.Region
}

type Account struct {
	*MongoDB
	*Cockroach
}

type MongoDB struct {
	Client         *mongo.Client
	AccountDBName  string
	BillingConn    string
	PropertiesConn string
	Properties     *resources.PropertyTypeLS
}

type Cockroach struct {
	ck *cockroach.Cockroach
}

func (g *Cockroach) GetAccount(ops types.UserQueryOpts) (*types.Account, error) {
	account, err := g.ck.GetAccount(&ops)
	if err != nil {
		return nil, fmt.Errorf("failed to get account: %v", err)
	}
	return account, nil
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
		return "", fmt.Errorf("failed to get user: %v", err)
	}
	return user.CrName, nil
}

func (g *Cockroach) GetPayment(ops types.UserQueryOpts, startTime, endTime time.Time) ([]types.Payment, error) {
	return g.ck.GetPayment(&ops, startTime, endTime)
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
	payment, err := g.GetPayment(ops, startTime, endTime)
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
		price := types.ViewPrice
		if price == 0 {
			price = types.UnitPrice
		}
		property := common.PropertyQuery{
			Name:      types.Name,
			UnitPrice: price,
			Unit:      types.UnitString,
			Alias:     types.Alias,
		}
		propertiesQuery = append(propertiesQuery, property)
	}
	return propertiesQuery, nil
}

func (m *MongoDB) GetCosts(user string, startTime, endTime time.Time) (common.TimeCostsMap, error) {
	filter := bson.M{
		"type": 0,
		"time": bson.M{
			"$gte": startTime,
			"$lte": endTime,
		},
		"owner": user,
	}
	cursor, err := m.getBillingCollection().Find(context.Background(), filter, options.Find().SetSort(bson.M{"time": 1}))
	if err != nil {
		return nil, fmt.Errorf("failed to get billing collection: %v", err)
	}
	defer cursor.Close(context.Background())
	var (
		accountBalanceList []struct {
			Time   time.Time `bson:"time"`
			Amount int64     `bson:"amount"`
		}
	)
	err = cursor.All(context.Background(), &accountBalanceList)
	if err != nil {
		return nil, fmt.Errorf("failed to decode all billing record: %w", err)
	}
	var costsMap = make(common.TimeCostsMap, len(accountBalanceList))
	for i := range accountBalanceList {
		costsMap[i] = append(costsMap[i], accountBalanceList[i].Time.Unix())
		costsMap[i] = append(costsMap[i], strconv.FormatInt(accountBalanceList[i].Amount, 10))
	}
	return costsMap, nil
}

func (m *MongoDB) GetAppCosts(req *helper.AppCostsReq) (*common.AppCosts, error) {
	pageSize := req.PageSize
	currentPage := req.Page

	timeMatch := bson.E{Key: "time", Value: bson.D{{Key: "$gte", Value: req.StartTime}, {Key: "$lt", Value: req.EndTime}}}
	pipeline := mongo.Pipeline{
		// Initially matches a document with app_costs.name equal to the specified value | 初步匹配 app_costs.name 等于指定值的文档
		{{Key: "$match", Value: bson.D{
			{Key: "app_costs.name", Value: req.AppName},
			{Key: "app_type", Value: resources.AppType[strings.ToUpper(req.AppType)]},
			{Key: "namespace", Value: req.Namespace},
			{Key: "owner", Value: req.Owner},
			timeMatch,
		}}},
		// Process total records and paging data in parallel | 并行处理总记录数和分页数据
		{{Key: "$facet", Value: bson.D{
			{Key: "totalRecords", Value: bson.A{
				bson.D{{Key: "$unwind", Value: "$app_costs"}},
				bson.D{{Key: "$match", Value: bson.D{
					{Key: "app_costs.name", Value: req.AppName},
					timeMatch,
				}}},
				bson.D{{Key: "$count", Value: "count"}},
			}},
			{Key: "costs", Value: bson.A{
				bson.D{{Key: "$unwind", Value: "$app_costs"}},
				bson.D{{Key: "$match", Value: bson.D{
					{Key: "app_costs.name", Value: req.AppName},
					timeMatch,
				}}},
				bson.D{{Key: "$skip", Value: (currentPage - 1) * pageSize}},
				bson.D{{Key: "$limit", Value: pageSize}},
				bson.D{{Key: "$project", Value: bson.D{
					{Key: "_id", Value: 0},
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
	var results common.AppCosts
	if cursor.Next(context.Background()) {
		if err := cursor.Decode(&results); err != nil {
			return nil, fmt.Errorf("failed to decode result: %v", err)
		}
	}
	results.CurrentPage = currentPage
	return &results, nil
}

func (m *MongoDB) GetConsumptionAmount(user, namespace, appType string, startTime, endTime time.Time) (int64, error) {
	return m.getAmountWithType(0, user, namespace, appType, startTime, endTime)
}

func (m *MongoDB) GetCostOverview(req helper.GetCostAppListReq) (resp helper.CostOverviewResp, rErr error) {
	appResp, err := m.GetCostAppList(req)
	if err != nil {
		rErr = fmt.Errorf("failed to get app store list: %w", err)
		return
	}
	resp.LimitResp = appResp.LimitResp
	for _, app := range appResp.Apps {
		totalAmount, err := m.GetTotalAppCost(req.Owner, app.Namespace, app.AppName, app.AppType)
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

func (m *MongoDB) GetTotalAppCost(owner string, namespace string, appName string, appType uint8) (int64, error) {
	var pipeline mongo.Pipeline

	if appType == resources.AppType[resources.AppStore] {
		// If appType is 8, match app_name and app_type directly
		pipeline = mongo.Pipeline{
			{{Key: "$match", Value: bson.D{
				{Key: "owner", Value: owner},
				{Key: "namespace", Value: namespace},
				{Key: "app_name", Value: appName},
				{Key: "app_type", Value: appType},
			}}},
			{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: nil},
				{Key: "totalAmount", Value: bson.D{{Key: "$sum", Value: "$amount"}}},
			}}},
		}
	} else {
		// Otherwise, match inside app_costs
		pipeline = mongo.Pipeline{
			{{Key: "$match", Value: bson.D{
				{Key: "owner", Value: owner},
				{Key: "namespace", Value: namespace},
				{Key: "app_costs.name", Value: appName},
				{Key: "app_type", Value: appType},
			}}},
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
	var (
		result []helper.CostApp
	)
	if req.PageSize <= 0 {
		req.PageSize = 10
	}
	if req.Page <= 0 {
		req.Page = 1
	}
	pageSize := req.PageSize
	if strings.ToUpper(req.AppType) != resources.AppStore {
		match := bson.M{
			"owner": req.Owner,
			// Exclude app store
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

		pipeline := mongo.Pipeline{
			{{Key: "$match", Value: match}},
			{{Key: "$unwind", Value: "$app_costs"}},
			{{Key: "$match", Value: bson.D{
				{Key: "app_costs.name", Value: req.AppName},
			}}},
		}
		if req.AppName == "" {
			pipeline = mongo.Pipeline{
				{{Key: "$match", Value: match}},
				{{Key: "$unwind", Value: "$app_costs"}},
			}
		}

		pipeline = append(pipeline, mongo.Pipeline{
			{{Key: "$group", Value: bson.D{
				{Key: "_id", Value: bson.D{
					{Key: "app_type", Value: "$app_type"},
					{Key: "app_name", Value: "$app_costs.name"},
				}},
				{Key: "namespace", Value: bson.D{{Key: "$first", Value: "$namespace"}}},
				{Key: "owner", Value: bson.D{{Key: "$first", Value: "$owner"}}},
			}}},
			{{Key: "$project", Value: bson.D{
				{Key: "_id", Value: 0},
				{Key: "namespace", Value: 1},
				{Key: "appType", Value: "$_id.app_type"},
				{Key: "owner", Value: 1},
				{Key: "appName", Value: "$_id.app_name"},
			}}},
		}...)

		limitPipeline := append(pipeline, bson.D{{Key: "$skip", Value: (req.Page - 1) * req.PageSize}}, bson.D{{Key: "$limit", Value: req.PageSize}})

		countPipeline := append(pipeline, bson.D{{Key: "$count", Value: "total"}})

		countCursor, err := m.getBillingCollection().Aggregate(context.Background(), countPipeline)
		if err != nil {
			rErr = fmt.Errorf("failed to execute count aggregate query: %w", err)
			return
		}
		defer countCursor.Close(context.Background())

		if countCursor.Next(context.Background()) {
			var countResult struct {
				Total int64 `bson:"total"`
			}
			if err := countCursor.Decode(&countResult); err != nil {
				rErr = fmt.Errorf("failed to decode count result: %w", err)
				return
			}
			resp.Total = countResult.Total
		}

		cursor, err := m.getBillingCollection().Aggregate(context.Background(), limitPipeline)
		if err != nil {
			rErr = fmt.Errorf("failed to execute aggregate query: %w", err)
			return
		}
		defer cursor.Close(context.Background())

		if err := cursor.All(context.Background(), &result); err != nil {
			rErr = fmt.Errorf("failed to decode all billing record: %w", err)
			return
		}
	}
	appStoreTotal, err := m.getAppStoreTotal(req)
	if err != nil {
		rErr = fmt.Errorf("failed to get app store total: %w", err)
		return
	}

	if req.AppType == "" || strings.ToUpper(req.AppType) == resources.AppStore {
		currentAppPageIsFull := len(result) == req.PageSize
		maxAppPageSize := (resp.Total + int64(req.PageSize) - 1) / int64(req.PageSize)
		completedNum := calculateComplement(int(resp.Total), req.PageSize)
		appPageSize := (resp.Total + int64(req.PageSize) - 1) / int64(req.PageSize)
		if req.Page == int(maxAppPageSize) {
			if !currentAppPageIsFull {
				appStoreResp, err := m.getAppStoreList(req, 0, completedNum)
				if err != nil {
					rErr = fmt.Errorf("failed to get app store list: %w", err)
					return
				}
				result = append(result, appStoreResp.Apps...)
			}
		} else if req.Page > int(maxAppPageSize) {
			skipPageSize := (req.Page - int(appPageSize) - 1) * req.PageSize
			if skipPageSize < 0 {
				skipPageSize = 0
			}
			appStoreResp, err := m.getAppStoreList(req, completedNum+skipPageSize, req.PageSize)
			if err != nil {
				rErr = fmt.Errorf("failed to get app store list: %w", err)
				return
			}
			result = append(result, appStoreResp.Apps...)
		}
		resp.Total += appStoreTotal
	}

	resp.TotalPage = (resp.Total + int64(pageSize) - 1) / int64(pageSize)
	resp.Apps = result
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

func (m *MongoDB) Disconnect(ctx context.Context) error {
	return m.Client.Disconnect(ctx)
}

func (m *MongoDB) getAmountWithType(_type int64, user, namespace, _appType string, startTime, endTime time.Time) (int64, error) {
	timeMatchValue := bson.D{primitive.E{Key: "$gte", Value: startTime}, primitive.E{Key: "$lte", Value: endTime}}
	matchValue := bson.D{
		primitive.E{Key: "time", Value: timeMatchValue},
		primitive.E{Key: "owner", Value: user},
		primitive.E{Key: "type", Value: _type},
	}
	if namespace != "" {
		matchValue = append(matchValue, primitive.E{Key: "namespace", Value: namespace})
	}
	if _appType != "" {
		matchValue = append(matchValue, primitive.E{Key: "app_type", Value: resources.AppType[strings.ToUpper(_appType)]})
	}
	matchStage := bson.D{
		primitive.E{
			Key: "$match", Value: matchValue,
		},
	}
	pipeline := bson.A{
		matchStage,
		bson.D{{Key: "$group", Value: bson.M{
			"_id":   nil,
			"total": bson.M{"$sum": "$amount"},
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

func NewAccountInterface(mongoURI, globalCockRoachURI, localCockRoachURI string) (Interface, error) {
	client, err := mongo.Connect(context.Background(), options.Client().ApplyURI(mongoURI))
	if err != nil {
		return nil, fmt.Errorf("failed to connect mongodb: %v", err)
	}
	if err = client.Ping(context.Background(), nil); err != nil {
		return nil, fmt.Errorf("failed to ping mongodb: %v", err)
	}
	mongodb := &MongoDB{
		Client:         client,
		AccountDBName:  "sealos-resources",
		BillingConn:    "billing",
		PropertiesConn: "properties",
	}
	ck, err := cockroach.NewCockRoach(globalCockRoachURI, localCockRoachURI)
	if err != nil {
		return nil, fmt.Errorf("failed to connect cockroach: %v", err)
	}
	if err = ck.InitTables(); err != nil {
		return nil, fmt.Errorf("failed to init tables: %v", err)
	}
	account := &Account{MongoDB: mongodb, Cockroach: &Cockroach{ck: ck}}
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
			Client:         client,
			AccountDBName:  "sealos-resources",
			BillingConn:    "billing",
			PropertiesConn: "properties",
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

func (m *MongoDB) GetBillingHistoryNamespaceList(req *helper.NamespaceBillingHistoryReq) ([]string, error) {
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
		return []string{}, nil
	}

	var result struct {
		Namespaces []string `bson:"namespaces"`
	}
	if err := cur.Decode(&result); err != nil {
		return nil, err
	}
	return result.Namespaces, nil
}

func (m *MongoDB) getBillingCollection() *mongo.Collection {
	return m.Client.Database(m.AccountDBName).Collection(m.BillingConn)
}
