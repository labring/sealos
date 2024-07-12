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
	GetConsumptionAmount(user, namespace, appType string, startTime, endTime time.Time) (int64, error)
	GetRechargeAmount(ops types.UserQueryOpts, startTime, endTime time.Time) (int64, error)
	GetPropertiesUsedAmount(user string, startTime, endTime time.Time) (map[string]int64, error)
	GetAccount(ops types.UserQueryOpts) (*types.Account, error)
	GetPayment(ops types.UserQueryOpts, startTime, endTime time.Time) ([]types.Payment, error)
	SetPaymentInvoice(req *helper.SetPaymentInvoiceReq) error
	Transfer(req *helper.TransferAmountReq) error
	GetTransfer(ops *types.GetTransfersReq) (*types.GetTransfersResp, error)
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
