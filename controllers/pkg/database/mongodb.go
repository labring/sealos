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
	"math"
	"time"

	"github.com/labring/sealos/controllers/pkg/crypto"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	"github.com/labring/sealos/controllers/pkg/common"
	"github.com/labring/sealos/pkg/utils/logger"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/sync/errgroup"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	DefaultDBName       = "sealos-resources"
	DefaultMeteringConn = "metering"
	DefaultMonitorConn  = "monitor"
	DefaultBillingConn  = "billing"
	DefaultPricesConn   = "prices"
)

const (
	MongoURI      = "MONGO_URI"
	MongoUsername = "MONGO_USERNAME"
	MongoPassword = "MONGO_PASSWORD"
)

const defaultCryptoKey = "Af0b2Bc5e9d0C84adF0A5887cF43aB63"

var cryptoKey = defaultCryptoKey

type MongoDB struct {
	URL          string
	Client       *mongo.Client
	DBName       string
	MonitorConn  string
	MeteringConn string
	BillingConn  string
	PricesConn   string
}

type AccountBalanceSpecBSON struct {
	OrderID string          `json:"order_id" bson:"order_id"`
	Owner   string          `json:"owner" bson:"owner"`
	Time    time.Time       `json:"time" bson:"time"`
	Type    accountv1.Type  `json:"type" bson:"type"`
	Costs   accountv1.Costs `json:"costs,omitempty" bson:"costs,omitempty"`
	Amount  int64           `json:"amount,omitempty" bson:"amount"`
}

func (m *MongoDB) Disconnect(ctx context.Context) error {
	return m.Client.Disconnect(ctx)
}

func (m *MongoDB) GetBillingLastUpdateTime(owner string, _type accountv1.Type) (bool, time.Time, error) {
	filter := bson.M{
		"owner": owner,
		"type":  _type,
	}
	findOneOptions := options.FindOne().SetSort(bson.D{primitive.E{Key: "time", Value: -1}})
	var result bson.M
	err := m.getBillingCollection().FindOne(context.Background(), filter, findOneOptions).Decode(&result)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			return false, time.Time{}, nil
		}
		return false, time.Time{}, err
	}
	// Assuming that the `time` field is stored as a `primitive.DateTime`
	if resultTime, ok := result["time"].(primitive.DateTime); ok {
		return true, resultTime.Time().UTC(), nil
	}

	return false, time.Time{}, fmt.Errorf("failed to convert time field to primitive.DateTime: %v", result["time"])
}

func (m *MongoDB) SaveBillingsWithAccountBalance(accountBalanceSpec *accountv1.AccountBalanceSpec) error {
	// Time    metav1.Time `json:"time" bson:"time"`
	// time字段如果为time.Time类型无法转换为json crd，所以使用metav1.Time，但是使用metav1.Time无法插入到mongo中，所以需要转换为time.Time

	accountBalanceTime := accountBalanceSpec.Time.Time

	// Create BSON document
	accountBalanceDoc := bson.M{
		"order_id": accountBalanceSpec.OrderID,
		"owner":    accountBalanceSpec.Owner,
		"time":     accountBalanceTime.UTC(),
		"type":     accountBalanceSpec.Type,
		"costs":    accountBalanceSpec.Costs,
		"amount":   accountBalanceSpec.Amount,
	}
	if accountBalanceSpec.Details != "" {
		accountBalanceDoc["details"] = accountBalanceSpec.Details
	}
	_, err := m.getBillingCollection().InsertOne(context.Background(), accountBalanceDoc)
	return err
}

func (m *MongoDB) GetMeteringOwnerTimeResult(queryTime time.Time, queryCategories, queryProperties []string, queryOwner string) (*MeteringOwnerTimeResult, error) {
	matchValue := bson.M{
		"time":     queryTime,
		"category": bson.M{"$in": queryCategories},
	}
	if len(queryProperties) > 0 {
		matchValue["property"] = bson.M{"$in": queryProperties}
	}
	pipeline := bson.A{
		bson.D{{Key: "$match", Value: matchValue}},
		bson.D{{Key: "$group", Value: bson.M{
			"_id":           bson.M{"property": "$property"},
			"propertyTotal": bson.M{"$sum": "$amount"},
		}}},
		bson.D{{Key: "$project", Value: bson.M{
			"_id":           0,
			"property":      "$_id.property",
			"propertyTotal": 1,
		}}},
		bson.D{{Key: "$group", Value: bson.M{
			"_id":         nil,
			"amountTotal": bson.M{"$sum": "$propertyTotal"},
			"costs":       bson.M{"$push": bson.M{"k": "$property", "v": "$propertyTotal"}},
		}}},
		bson.D{{Key: "$addFields", Value: bson.M{
			"owner":  queryOwner,
			"time":   queryTime,
			"amount": "$amountTotal",
			"costs":  bson.M{"$arrayToObject": "$costs"},
		}}},
	}

	/*
		db.metering.aggregate([
		{ $match:
		  { time: queryTime, category:
		     { $in: ["ns-gxqoxr8s"] }, property: { $in: ["cpu", "memory", "storage"] } } },
		{ $group: { _id: { property: "$property" }, propertyTotal: { $sum: "$amount" } } },
		{ $project: { _id: 0, property: "$_id.property", propertyTotal: 1 } },
		{ $group: { _id: null, amountTotal: { $sum: "$propertyTotal" }, costs: { $push: { k: "$property", v: "$propertyTotal" } } } },
		{ $addFields: { orderId: "111111111", own: queryOwn, time: queryTime, type: 0, amount: "$amountTotal", costs: { $arrayToObject: "$costs" } } },
		{ $out: "results1" }]);
	*/
	cursor, err := m.getMeteringCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())
	if cursor.Next(context.Background()) {
		var result MeteringOwnerTimeResult
		if err = cursor.Decode(&result); err != nil {
			return nil, err
		}
		return &result, nil
	}
	return nil, nil
}

// InsertMonitor insert monitor data to mongodb collection monitor + time (eg: monitor_20200101)
// The monitor data is saved daily 2020-12-01 00:00:00 - 2020-12-01 23:59:59 => monitor_20201201
func (m *MongoDB) InsertMonitor(ctx context.Context, monitors ...*common.Monitor) error {
	if len(monitors) == 0 {
		return nil
	}
	var manyMonitor []interface{}
	for i := range monitors {
		manyMonitor = append(manyMonitor, monitors[i])
	}
	_, err := m.getMonitorCollection(monitors[0].Time).InsertMany(ctx, manyMonitor)
	return err
}

func (m *MongoDB) GetAllPricesMap() (map[string]common.Price, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	cursor, err := m.getPricesCollection().Find(ctx, bson.M{})
	if err != nil {
		return nil, fmt.Errorf("get all prices error: %v", err)
	}
	var prices []struct {
		Property string `json:"property" bson:"property"`
		Price    string `json:"price" bson:"price"`
		Detail   string `json:"detail" bson:"detail"`
	}
	if err = cursor.All(ctx, &prices); err != nil {
		return nil, fmt.Errorf("get all prices error: %v", err)
	}
	var pricesMap = make(map[string]common.Price, len(prices))
	for i := range prices {
		price, err := crypto.DecryptInt64WithKey(prices[i].Price, []byte(cryptoKey))
		if err != nil {
			return nil, fmt.Errorf("decrypt price error: %v", err)
		}
		pricesMap[prices[i].Property] = common.Price{
			Price:    price,
			Detail:   prices[i].Detail,
			Property: prices[i].Property,
		}
	}
	return pricesMap, nil
}

// 2020-12-01 23:00:00 - 2020-12-02 00:00:00
// 2020-12-02 00:00:00 - 2020-12-02 01:00:00
func (m *MongoDB) GenerateMeteringData(startTime, endTime time.Time, prices map[string]common.Price) error {
	filter := bson.M{
		"time": bson.M{
			"$gte": startTime,
			"$lt":  endTime,
		},
	}
	cursor, err := m.getMonitorCollection(startTime).Find(context.Background(), filter)
	if err != nil {
		return fmt.Errorf("find monitors error: %v", err)
	}
	defer cursor.Close(context.Background())

	meteringMap := make(map[string]map[string]int64)
	countMap := make(map[string]map[string]int64)
	updateTimeMap := make(map[string]map[string]*time.Time)

	for cursor.Next(context.Background()) {
		var monitor common.Monitor
		if err := cursor.Decode(&monitor); err != nil {
			return fmt.Errorf("decode monitor error: %v", err)
		}

		if _, ok := updateTimeMap[monitor.Category]; !ok {
			updateTimeMap[monitor.Category] = make(map[string]*time.Time)
		}
		if _, ok := updateTimeMap[monitor.Category][monitor.Property]; !ok {
			lastUpdateTime, err := m.GetUpdateTimeForCategoryAndPropertyFromMetering(monitor.Category, monitor.Property)
			if err != nil {
				logger.Debug(err, "get latest update time failed", "category", monitor.Category, "property", monitor.Property)
			}
			updateTimeMap[monitor.Category][monitor.Property] = &lastUpdateTime
		}
		lastUpdateTime := updateTimeMap[monitor.Category][monitor.Property].UTC()

		if /* skip last update lte 1 hour*/ lastUpdateTime.Before(startTime) || lastUpdateTime.Equal(startTime) {
			if _, ok := meteringMap[monitor.Category]; !ok {
				meteringMap[monitor.Category] = make(map[string]int64)
				countMap[monitor.Category] = make(map[string]int64)
			}

			meteringMap[monitor.Category][monitor.Property] += monitor.Value
			countMap[monitor.Category][monitor.Property]++
			continue
		}
		logger.Debug("Info", "skip metering", "category", monitor.Category, "property", monitor.Property, "lastUpdateTime", updateTimeMap[monitor.Category][monitor.Property].UTC(), "startTime", startTime)
	}

	if err := cursor.Err(); err != nil {
		return fmt.Errorf("cursor error: %v", err)
	}
	eg, _ := errgroup.WithContext(context.Background())

	for category, propertyMap := range meteringMap {
		for property, totalValue := range propertyMap {
			count := countMap[category][property]
			if count < 60 {
				count = 60
			}
			unitValue := math.Ceil(float64(totalValue) / float64(count))
			metering := &common.Metering{
				Category: category,
				Property: property,
				Time:     endTime,
				Amount:   int64(unitValue * float64(prices[property].Price)),
				Value:    int64(unitValue),
				//Detail:   "",
			}
			_category, _property := category, property
			eg.Go(func() error {
				_, err := m.getMeteringCollection().InsertOne(context.Background(), metering)
				if err != nil {
					//TODO if insert failed, should todo?
					logger.Error(err, "insert metering data failed", "category", _category, "property", _property)
				}
				return err
			})
		}
	}
	return eg.Wait()
}

func (m *MongoDB) GetUpdateTimeForCategoryAndPropertyFromMetering(category string, property string) (time.Time, error) {
	filter := bson.M{"category": category, "property": property}
	// sort by time desc
	opts := options.FindOne().SetSort(bson.D{primitive.E{Key: "time", Value: -1}})

	var result struct {
		Time time.Time `bson:"time"`
	}
	err := m.getMeteringCollection().FindOne(context.Background(), filter, opts).Decode(&result)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			// No documents match the filter. Handle this case accordingly.
			return time.Time{}, nil
		}
		return time.Time{}, err
	}
	return result.Time, nil
}

func (m *MongoDB) queryBillingRecordsByOrderID(billingRecordQuery *accountv1.BillingRecordQuery, owner string) error {
	if billingRecordQuery.Spec.OrderID == "" {
		return fmt.Errorf("order id is empty")
	}
	billingColl := m.getBillingCollection()
	matchStage := bson.D{
		primitive.E{Key: "$match", Value: bson.D{
			primitive.E{Key: "order_id", Value: billingRecordQuery.Spec.OrderID},
			primitive.E{Key: "owner", Value: owner},
		}},
	}
	var billingRecords []accountv1.AccountBalanceSpec
	ctx := context.Background()

	cursor, err := billingColl.Aggregate(ctx, bson.A{matchStage})
	if err != nil {
		return fmt.Errorf("failed to execute aggregate query: %w", err)
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var bsonRecord AccountBalanceSpecBSON
		if err := cursor.Decode(&bsonRecord); err != nil {
			return fmt.Errorf("failed to decode billing record: %w", err)
		}
		billingRecord := accountv1.AccountBalanceSpec{
			OrderID: bsonRecord.OrderID,
			Owner:   bsonRecord.Owner,
			Time:    metav1.NewTime(bsonRecord.Time),
			Type:    bsonRecord.Type,
			Costs:   bsonRecord.Costs,
			Amount:  bsonRecord.Amount,
		}
		billingRecords = append(billingRecords, billingRecord)
	}

	billingRecordQuery.Status.Items = billingRecords
	billingRecordQuery.Status.PageLength = 1
	billingRecordQuery.Status.TotalCount = len(billingRecords)
	return nil
}

func (m *MongoDB) QueryBillingRecords(billingRecordQuery *accountv1.BillingRecordQuery, owner string) (err error) {
	if billingRecordQuery.Spec.OrderID != "" {
		return m.queryBillingRecordsByOrderID(billingRecordQuery, owner)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	billingColl := m.getBillingCollection()
	timeMatchValue := bson.D{primitive.E{Key: "$gte", Value: billingRecordQuery.Spec.StartTime.Time}, primitive.E{Key: "$lte", Value: billingRecordQuery.Spec.EndTime.Time}}
	matchStage := bson.D{
		primitive.E{
			Key: "$match", Value: bson.D{
				primitive.E{Key: "time", Value: timeMatchValue},
				primitive.E{Key: "owner", Value: owner},
			},
		},
	}

	if billingRecordQuery.Spec.Type != -1 {
		matchStage = bson.D{
			primitive.E{
				Key: "$match", Value: bson.D{
					primitive.E{Key: "time", Value: timeMatchValue},
					primitive.E{Key: "owner", Value: owner},
					primitive.E{Key: "type", Value: billingRecordQuery.Spec.Type},
				},
			},
		}
	}

	// Pipeline for getting the paginated data
	pipeline := bson.A{
		matchStage,
		bson.D{primitive.E{Key: "$sort", Value: bson.D{primitive.E{Key: "time", Value: -1}}}},
		bson.D{primitive.E{Key: "$skip", Value: (billingRecordQuery.Spec.Page - 1) * billingRecordQuery.Spec.PageSize}},
		bson.D{primitive.E{Key: "$limit", Value: billingRecordQuery.Spec.PageSize}},
	}

	pipelineAll := bson.A{
		matchStage,
		bson.D{primitive.E{Key: "$group", Value: bson.D{
			primitive.E{Key: "_id", Value: nil},
			primitive.E{Key: "result", Value: bson.D{primitive.E{Key: "$sum", Value: 1}}},
		}}},
	}

	pipelineCountAndAmount := bson.A{
		bson.D{{Key: "$match", Value: bson.D{
			{Key: "time", Value: timeMatchValue},
			{Key: "owner", Value: owner},
			{Key: "type", Value: accountv1.Consumption},
		}}},
		bson.D{{Key: "$addFields", Value: bson.D{
			{Key: "costsArray", Value: bson.D{{Key: "$objectToArray", Value: "$costs"}}},
		}}},
		bson.D{{Key: "$unwind", Value: "$costsArray"}},
		bson.D{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: bson.D{
				{Key: "type", Value: "$type"},
				{Key: "key", Value: "$costsArray.k"},
			}},
			{Key: "total", Value: bson.D{{Key: "$sum", Value: "$costsArray.v"}}},
			{Key: "count", Value: bson.D{{Key: "$sum", Value: 1}}},
		}}},
	}

	pipelineRechargeAmount := bson.A{
		bson.D{{Key: "$match", Value: bson.D{
			{Key: "time", Value: timeMatchValue},
			{Key: "owner", Value: owner},
			{Key: "type", Value: accountv1.Recharge},
		}}},
		bson.D{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: nil},
			{Key: "totalRechargeAmount", Value: bson.D{{Key: "$sum", Value: "$amount"}}},
			{Key: "count", Value: bson.D{{Key: "$sum", Value: 1}}},
		}}},
	}

	cursor, err := billingColl.Aggregate(ctx, pipeline)
	if err != nil {
		return fmt.Errorf("failed to execute aggregate query: %w", err)
	}
	defer cursor.Close(ctx)

	var billingRecords []accountv1.AccountBalanceSpec
	for cursor.Next(ctx) {
		var bsonRecord AccountBalanceSpecBSON
		if err := cursor.Decode(&bsonRecord); err != nil {
			return fmt.Errorf("failed to decode billing record: %w", err)
		}
		billingRecord := accountv1.AccountBalanceSpec{
			OrderID: bsonRecord.OrderID,
			Owner:   bsonRecord.Owner,
			Time:    metav1.NewTime(bsonRecord.Time),
			Type:    bsonRecord.Type,
			Costs:   bsonRecord.Costs,
			Amount:  bsonRecord.Amount,
		}
		billingRecords = append(billingRecords, billingRecord)
	}

	totalCount := 0

	// 总数量
	cursorAll, err := billingColl.Aggregate(ctx, pipelineAll)
	if err != nil {
		return fmt.Errorf("failed to execute aggregate all query: %w", err)
	}
	defer cursorAll.Close(ctx)
	for cursorAll.Next(ctx) {
		var result struct {
			Result int64 `bson:"result"`
		}
		if err := cursorAll.Decode(&result); err != nil {
			return fmt.Errorf("failed to decode query count record: %w", err)
		}
		totalCount = int(result.Result)
	}

	// 消费总金额Costs Executing the second pipeline for getting the total count, recharge and deduction amount
	cursorCountAndAmount, err := billingColl.Aggregate(ctx, pipelineCountAndAmount)
	if err != nil {
		return fmt.Errorf("failed to execute aggregate query for count and amount: %w", err)
	}
	defer cursorCountAndAmount.Close(ctx)

	totalDeductionAmount := make(map[string]int64)
	totalRechargeAmount := int64(0)

	for cursorCountAndAmount.Next(ctx) {
		var result struct {
			ID struct {
				Type int    `bson:"type"`
				Key  string `bson:"key"`
			} `bson:"_id"`
			Total int64 `bson:"total"`
		}
		if err := cursorCountAndAmount.Decode(&result); err != nil {
			return fmt.Errorf("failed to decode billing record: %w", err)
		}
		if result.ID.Type == 0 {
			totalDeductionAmount[result.ID.Key] = result.Total
		}
	}

	// 充值总金额
	cursorRechargeAmount, err := billingColl.Aggregate(ctx, pipelineRechargeAmount)
	if err != nil {
		return fmt.Errorf("failed to execute aggregate query for recharge amount: %w", err)
	}
	defer cursorRechargeAmount.Close(ctx)

	for cursorRechargeAmount.Next(ctx) {
		var result struct {
			TotalRechargeAmount int64 `bson:"totalRechargeAmount"`
			Count               int   `bson:"count"`
		}
		if err := cursorRechargeAmount.Decode(&result); err != nil {
			return fmt.Errorf("failed to decode recharge amount record: %w", err)
		}
		totalRechargeAmount = result.TotalRechargeAmount
	}

	totalPages := (totalCount + billingRecordQuery.Spec.PageSize - 1) / billingRecordQuery.Spec.PageSize
	if totalCount == 0 {
		totalPages = 1
		totalCount = len(billingRecords)
	}
	billingRecordQuery.Status.Items, billingRecordQuery.Status.PageLength, billingRecordQuery.Status.TotalCount,
		billingRecordQuery.Status.RechargeAmount, billingRecordQuery.Status.DeductionAmount = billingRecords, totalPages, totalCount, totalRechargeAmount, totalDeductionAmount
	return nil
}

func (m *MongoDB) GetBillingCount(accountType accountv1.Type, startTime, endTime time.Time) (count, amount int64, err error) {
	filter := bson.M{
		"type": accountType,
		"time": bson.M{
			"$gte": startTime,
			"$lte": endTime,
		},
	}
	cursor, err := m.getBillingCollection().Find(context.Background(), filter)
	if err != nil {
		return 0, 0, err
	}
	defer cursor.Close(context.Background())
	var accountBalanceList []AccountBalanceSpecBSON
	err = cursor.All(context.Background(), &accountBalanceList)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to decode all billing record: %w", err)
	}
	for i := range accountBalanceList {
		count++
		amount += accountBalanceList[i].Amount
	}
	//for cursor.Next(context.Background()) {
	//    var accountBalance AccountBalanceSpecBSON
	//    if err := cursor.Decode(&accountBalance); err != nil {
	//        return 0, 0, err
	//    }
	//    count++
	//    amount += accountBalance.Amount
	//}
	return
}

func (m *MongoDB) getMeteringCollection() *mongo.Collection {
	return m.Client.Database(m.DBName).Collection(m.MeteringConn)
}

func (m *MongoDB) getMonitorCollection(collTime time.Time) *mongo.Collection {
	// 2020-12-01 00:00:00 - 2020-12-01 23:59:59
	return m.Client.Database(m.DBName).Collection(m.getMonitorCollectionName(collTime))
}

func (m *MongoDB) getMonitorCollectionName(collTime time.Time) string {
	// 按天计算尾缀，如202012月1号 尾缀为20201201
	return fmt.Sprintf("%s_%s", m.MonitorConn, collTime.Format("20060102"))
}

func (m *MongoDB) getPricesCollection() *mongo.Collection {
	return m.Client.Database(m.DBName).Collection(m.PricesConn)
}

func (m *MongoDB) getBillingCollection() *mongo.Collection {
	return m.Client.Database(m.DBName).Collection(m.BillingConn)
}

func (m *MongoDB) CreateBillingIfNotExist() error {
	if exist, err := m.collectionExist(m.DBName, m.BillingConn); exist || err != nil {
		return err
	}
	ctx := context.Background()
	err := m.Client.Database(m.DBName).CreateCollection(ctx, m.BillingConn)
	if err != nil {
		return fmt.Errorf("failed to create collection for billing: %w", err)
	}

	// 创建索引
	_, err = m.getBillingCollection().Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			// 唯一索引 owner + order_id
			Keys:    bson.D{primitive.E{Key: "owner", Value: 1}, primitive.E{Key: "order_id", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			// owner + time + type 索引
			Keys: bson.D{
				primitive.E{Key: "owner", Value: 1},
				primitive.E{Key: "time", Value: 1},
				primitive.E{Key: "type", Value: 1},
			},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to create index for billing: %w", err)
	}
	return nil
}

// CreateMonitorTimeSeriesIfNotExist creates the time series table for monitor
func (m *MongoDB) CreateMonitorTimeSeriesIfNotExist(collTime time.Time) error {
	return m.CreateTimeSeriesIfNotExist(m.DBName, m.getMonitorCollectionName(collTime))
}

// CreateMeteringTimeSeriesIfNotExist creates the time series table for metering
func (m *MongoDB) CreateMeteringTimeSeriesIfNotExist() error {
	return m.CreateTimeSeriesIfNotExist(m.DBName, m.MeteringConn)
}

func (m *MongoDB) CreateTimeSeriesIfNotExist(dbName, collectionName string) error {
	// Check if the collection already exists
	if exist, err := m.collectionExist(dbName, collectionName); exist || err != nil {
		return err
	}

	// If the collection does not exist, create it
	cmd := bson.D{
		primitive.E{Key: "create", Value: collectionName},
		primitive.E{Key: "timeseries", Value: bson.D{{Key: "timeField", Value: "time"}}},
	}
	return m.Client.Database(dbName).RunCommand(context.TODO(), cmd).Err()
}

func (m *MongoDB) collectionExist(dbName, collectionName string) (bool, error) {
	// Check if the collection already exists
	collections, err := m.Client.Database(dbName).ListCollectionNames(context.Background(), bson.M{"name": collectionName})
	return len(collections) > 0, err
}

func NewMongoDB(ctx context.Context, URL string) (Interface, error) {
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(URL))
	if err != nil {
		return nil, err
	}
	err = client.Ping(ctx, nil)
	return &MongoDB{
		Client:       client,
		URL:          URL,
		DBName:       DefaultDBName,
		MeteringConn: DefaultMeteringConn,
		MonitorConn:  DefaultMonitorConn,
		BillingConn:  DefaultBillingConn,
		PricesConn:   DefaultPricesConn,
	}, err
}
