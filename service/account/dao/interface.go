package dao

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/crypto"
	"gorm.io/driver/postgres"

	"gorm.io/gorm"

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
	GetConsumptionAmount(user string, startTime, endTime time.Time) (int64, error)
	GetRechargeAmount(user string, startTime, endTime time.Time) (int64, error)
	GetPropertiesUsedAmount(user string, startTime, endTime time.Time) (map[string]int64, error)
	GetAccount(ops types.UserQueryOpts) (*types.Account, error)
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
	DB      *gorm.DB
	LocalDB *gorm.DB
}

func (g *Cockroach) GetAccount(ops types.UserQueryOpts) (*types.Account, error) {
	if ops.UID == uuid.Nil {
		user, err := g.GetUser(ops)
		if err != nil {
			return nil, fmt.Errorf("failed to get user: %v", err)
		}
		ops.UID = user.RealUserUID
	}
	var account types.Account
	if err := g.DB.Where(types.Account{UserUID: ops.UID}).First(&account).Error; err != nil {
		return nil, fmt.Errorf("failed to get account: %w", err)
	}
	balance, err := crypto.DecryptInt64(account.EncryptBalance)
	if err != nil {
		return nil, fmt.Errorf("failed to descrypt balance: %v", err)
	}
	deductionBalance, err := crypto.DecryptInt64(account.EncryptDeductionBalance)
	if err != nil {
		return nil, fmt.Errorf("failed to descrypt deduction balance: %v", err)
	}
	account.Balance = balance
	account.DeductionBalance = deductionBalance
	return &account, nil
}

func (g *Cockroach) GetUser(ops types.UserQueryOpts) (*types.RegionUser, error) {
	if err := checkOps(ops); err != nil {
		return nil, err
	}
	query := &types.RegionUser{
		ID: ops.Owner,
	}
	if ops.UID != uuid.Nil {
		query.RealUserUID = ops.UID
	}
	var user types.RegionUser
	if err := g.LocalDB.Where(query).First(&user).Error; err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return &user, nil
}

func checkOps(ops types.UserQueryOpts) error {
	if ops.Owner == "" && ops.UID == uuid.Nil {
		return fmt.Errorf("empty query opts")
	}
	return nil
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

func (m *MongoDB) GetConsumptionAmount(user string, startTime, endTime time.Time) (int64, error) {
	return m.getAmountWithType(0, user, startTime, endTime)
}

func (m *MongoDB) GetRechargeAmount(user string, startTime, endTime time.Time) (int64, error) {
	return m.getAmountWithType(1, user, startTime, endTime)
}

func (m *MongoDB) getAmountWithType(_type int64, user string, startTime, endTime time.Time) (int64, error) {
	pipeline := bson.A{
		bson.D{{Key: "$match", Value: bson.M{
			"type":  _type,
			"time":  bson.M{"$gte": startTime, "$lte": endTime},
			"owner": user,
		}}},
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

func NewAccountInterface(mongoURI, cockRoachURI, localCockRoachURI string) (Interface, error) {
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
	db, err := gorm.Open(postgres.Open(cockRoachURI), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect cockroach uri %s: %v", cockRoachURI, err)
	}
	localDB, err := gorm.Open(postgres.Open(localCockRoachURI), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect local cockroach uri %s: %v", localCockRoachURI, err)
	}
	account := &Account{MongoDB: mongodb, Cockroach: &Cockroach{DB: db, LocalDB: localDB}}
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
