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

package mongo

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/labring/sealos/controllers/pkg/types"

	"github.com/labring/sealos/controllers/pkg/utils/env"

	"github.com/labring/sealos/controllers/pkg/common"
	"github.com/labring/sealos/controllers/pkg/database"

	gonanoid "github.com/matoous/go-nanoid/v2"

	"github.com/labring/sealos/controllers/pkg/resources"
	"github.com/labring/sealos/controllers/pkg/utils/logger"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	EnvAccountDBName = "ACCOUNT_DB_NAME"
	EnvTrafficDBName = "TRAFFIC_DB_NAME"
	EnvCVMDBName     = "CVM_DB_NAME"
	EnvCVMConn       = "CVM_DB_CONN"
	EnvTrafficConn   = "TRAFFIC_CONN"
)

const (
	DefaultAccountDBName  = "sealos-resources"
	DefaultTrafficDBName  = "sealos-networkmanager"
	DefaultAuthDBName     = "sealos-auth"
	DefaultCVMDBName      = "sealos-cvm"
	DefaultCVMConn        = "cvm"
	DefaultMeteringConn   = "metering"
	DefaultMonitorConn    = "monitor"
	DefaultBillingConn    = "billing"
	DefaultObjTrafficConn = "objectstorage-traffic"
	DefaultUserConn       = "user"
	DefaultPricesConn     = "prices"
	DefaultPropertiesConn = "properties"
	//TODO fix
	DefaultTrafficConn = "traffic"
)

type mongoDB struct {
	Client            *mongo.Client
	AccountDB         string
	TrafficDB         string
	AuthDB            string
	CvmDB             string
	CvmConn           string
	UserConn          string
	MonitorConnPrefix string
	MeteringConn      string
	BillingConn       string
	ObjTrafficConn    string
	PropertiesConn    string
	TrafficConn       string
}

type BillingRecordQueryItem struct {
	Time                         metav1.Time `json:"time" bson:"time"`
	BillingRecordQueryItemInline `json:",inline"`
}

type BillingRecordQueryItemInline struct {
	Name      string      `json:"name,omitempty" bson:"name,omitempty"`
	OrderID   string      `json:"order_id" bson:"order_id"`
	Namespace string      `json:"namespace,omitempty" bson:"namespace,omitempty"`
	Type      common.Type `json:"type" bson:"type"`
	AppType   string      `json:"appType,omitempty" bson:"appType,omitempty"`
	Costs     Costs       `json:"costs,omitempty" bson:"costs,omitempty"`
	//Amount = PaymentAmount + GiftAmount
	Amount int64 `json:"amount,omitempty" bson:"amount"`
	// when Type = Recharge, PaymentAmount is the amount of recharge
	Payment *PaymentForQuery `json:"payment,omitempty" bson:"payment,omitempty"`
}

type Costs map[string]int64

type PaymentForQuery struct {
	Amount int64 `json:"amount,omitempty" bson:"amount,omitempty"`
}

const (
	// Consumption 消费
	Consumption common.Type = iota
)

type AccountBalanceSpecBSON struct {
	// Time    metav1.Time `json:"time" bson:"time"`
	// If the Time field is of the time. time type, it cannot be converted to json crd, so use metav1.Time. However, metav1.Time cannot be inserted into mongo, so you need to convert it to time.Time
	Time                         time.Time `json:"time" bson:"time"`
	BillingRecordQueryItemInline `json:",inline" bson:",inline"`
}

func (m *mongoDB) Disconnect(ctx context.Context) error {
	return m.Client.Disconnect(ctx)
}

func (m *mongoDB) GetBillingLastUpdateTime(owner string, _type common.Type) (bool, time.Time, error) {
	// skip cvm billing time
	filter := bson.M{
		"owner": owner,
		"type":  _type,
		"app_type": bson.M{
			"$ne": resources.AppType[resources.CVM],
		},
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

func (m *mongoDB) GetOwnersRecentUpdates(ownerList []string, checkTime time.Time) ([]string, error) {
	// MongoDB filter
	filter := bson.M{
		"owner": bson.M{"$in": ownerList},
		"type":  common.Consumption,
		"app_type": bson.M{
			"$nin": []int{int(resources.AppType[resources.CVM]), int(resources.AppType[resources.LLMToken])},
		},
	}

	// Aggregate query: Group by owner to get the latest time
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: filter}},
		{{Key: "$sort", Value: bson.D{{Key: "owner", Value: 1}, {Key: "time", Value: -1}}}}, // Sort by owner first, then by time in descending order
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: "$owner"},
			{Key: "lastUpdateTime", Value: bson.D{{Key: "$first", Value: "$time"}}}, // fetch latest Time
		}}},
	}
	// execute aggregate query
	cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to execute aggregate query: %w", err)
	}
	defer cursor.Close(context.Background())

	// get all the data out at once
	var results []struct {
		Owner         string             `bson:"_id"`
		LastUpdateRaw primitive.DateTime `bson:"lastUpdateTime"`
	}
	if err := cursor.All(context.Background(), &results); err != nil {
		return nil, fmt.Errorf("failed to decode cursor: %w", err)
	}

	// use map to store query results
	latestUpdates := make(map[string]time.Time, len(results))
	for _, result := range results {
		latestUpdates[result.Owner] = result.LastUpdateRaw.Time()
	}

	// **In-memory processing: Filters owners that have been updated since checkTime**
	var updatedOwners []string
	for _, owner := range ownerList {
		lastUpdateTime, exists := latestUpdates[owner]
		if exists && (lastUpdateTime.After(checkTime) || lastUpdateTime.Equal(checkTime)) {
			updatedOwners = append(updatedOwners, owner)
		}
	}
	return updatedOwners, nil
}

func (m *mongoDB) GetTimeUsedNamespaceList(startTime, endTime time.Time) ([]string, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "time", Value: bson.D{{Key: "$gte", Value: startTime}, {Key: "$lt", Value: endTime}}}}}},
		{{Key: "$group", Value: bson.D{{Key: "_id", Value: "$category"}}}},
		{{Key: "$project", Value: bson.D{{Key: "_id", Value: 0}, {Key: "namespace", Value: "$_id"}}}},
	}
	cursor, err := m.getMonitorCollection(startTime).Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, fmt.Errorf("aggregate error: %v", err)
	}
	defer cursor.Close(context.Background())

	var namespaces []string
	for cursor.Next(context.Background()) {
		var result struct {
			Namespace string `bson:"namespace"`
		}
		err := cursor.Decode(&result)
		if err != nil {
			return nil, fmt.Errorf("decode error: %v", err)
		}
		namespaces = append(namespaces, result.Namespace)
	}
	if err = cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %v", err)
	}
	return namespaces, nil
}

func (m *mongoDB) GetUnsettingBillingHandler(owner string) ([]resources.BillingHandler, error) {
	filter := bson.M{
		"owner": owner,
		"status": bson.M{
			"$in": []resources.BillingStatus{
				resources.Unsettled,
			},
		},
	}
	findOptions := options.Find()
	cur, err := m.getBillingCollection().Find(context.Background(), filter, findOptions)
	if err != nil {
		return nil, fmt.Errorf("find error: %v", err)
	}
	defer cur.Close(context.Background())
	var results []resources.BillingHandler
	for cur.Next(context.Background()) {
		var result resources.BillingHandler
		if err := cur.Decode(&result); err != nil {
			return nil, fmt.Errorf("decode error: %v", err)
		}
		results = append(results, result)
	}
	if err := cur.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %v", err)
	}
	return results, nil
}

func (m *mongoDB) UpdateBillingStatus(orderIDs []string, status resources.BillingStatus) error {
	// create a query filter
	filter := bson.M{"order_id": bson.M{"$in": orderIDs}}
	update := bson.M{
		"$set": bson.M{
			"status": status,
		},
	}
	_, err := m.getBillingCollection().UpdateMany(context.Background(), filter, update)
	if err != nil {
		return fmt.Errorf("update error: %v", err)
	}
	return nil
}

func (m *mongoDB) SaveBillings(billing ...*resources.Billing) error {
	billings := make([]interface{}, len(billing))
	for i, b := range billing {
		billings[i] = b
	}
	_, err := m.getBillingCollection().InsertMany(context.Background(), billings)
	return err
}

func (m *mongoDB) SaveObjTraffic(obs ...*types.ObjectStorageTraffic) error {
	traffic := make([]interface{}, len(obs))
	for i, ob := range obs {
		traffic[i] = ob
	}
	_, err := m.getObjTrafficCollection().InsertMany(context.Background(), traffic)
	return err
}

func (m *mongoDB) GetAllLatestObjTraffic(startTime, endTime time.Time) ([]types.ObjectStorageTraffic, error) {
	pipeline := []bson.M{
		{
			"$match": bson.M{
				"time": bson.M{
					"$gt":  startTime,
					"$lte": endTime,
				},
			},
		},
		{
			"$sort": bson.M{"time": -1},
		},
		{
			"$group": bson.M{
				"_id":       bson.M{"user": "$user", "bucket": "$bucket"},
				"latestDoc": bson.M{"$first": "$$ROOT"},
			},
		},
		{
			"$replaceRoot": bson.M{"newRoot": "$latestDoc"},
		},
	}

	cursor, err := m.getObjTrafficCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var results []types.ObjectStorageTraffic
	if err = cursor.All(context.Background(), &results); err != nil {
		return nil, err
	}

	return results, nil
}

func (m *mongoDB) HandlerTimeObjBucketSentTraffic(startTime, endTime time.Time, bucket string) (int64, error) {
	pipeline := []bson.M{
		{
			"$match": bson.M{
				"time": bson.M{
					"$gt":  startTime,
					"$lte": endTime,
				},
				"bucket": bucket,
			},
		},
		{
			"$group": bson.M{
				"_id":       nil,
				"totalSent": bson.M{"$sum": "$sent"},
			},
		},
	}
	cursor, err := m.getObjTrafficCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(context.Background())

	var result struct {
		TotalSent int64 `bson:"totalSent"`
	}
	if cursor.Next(context.Background()) {
		if err := cursor.Decode(&result); err != nil {
			return 0, err
		}
		return result.TotalSent, nil
	}
	if err := cursor.Err(); err != nil {
		return 0, err
	}
	return 0, nil
}

func (m *mongoDB) GetTimeObjBucketBucket(startTime, endTime time.Time) ([]string, error) {
	pipeline := []bson.M{
		{
			"$match": bson.M{
				"time": bson.M{
					"$gt":  startTime,
					"$lte": endTime,
				},
			},
		},
		{
			"$group": bson.M{
				"_id":     nil,
				"buckets": bson.M{"$addToSet": "$bucket"},
			},
		},
	}
	cursor, err := m.getObjTrafficCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var result struct {
		Buckets []string `bson:"buckets"`
	}
	if cursor.Next(context.Background()) {
		if err := cursor.Decode(&result); err != nil {
			return nil, err
		}
		return result.Buckets, nil
	}
	if err := cursor.Err(); err != nil {
		return nil, err
	}
	return nil, nil
}

// InsertMonitor insert monitor data to mongodb collection monitor + time (eg: monitor_20200101)
// The monitor data is saved daily 2020-12-01 00:00:00 - 2020-12-01 23:59:59 => monitor_20201201
func (m *mongoDB) InsertMonitor(ctx context.Context, monitors ...*resources.Monitor) error {
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

func (m *mongoDB) GetDistinctMonitorCombinations(startTime, endTime time.Time) ([]resources.Monitor, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"time": bson.M{
				"$gte": startTime.UTC(),
				"$lt":  endTime.UTC(),
			},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{
				"category": "$category",
				"name":     "$name",
				"type":     "$type",
			},
		}}},
		{{Key: "$project", Value: bson.M{
			"_id":      0,
			"category": "$_id.category",
			"name":     "$_id.name",
			"type":     "$_id.type",
		}}},
	}
	cursor, err := m.getMonitorCollection(startTime).Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, fmt.Errorf("aggregate error: %v", err)
	}
	defer cursor.Close(context.Background())
	if !cursor.Next(context.Background()) {
		return nil, nil
	}
	var monitors []resources.Monitor
	if err := cursor.All(context.Background(), &monitors); err != nil {
		return nil, fmt.Errorf("cursor error: %v", err)
	}
	return monitors, nil
}

func (m *mongoDB) GetAllPayment() ([]resources.Billing, error) {
	filter := bson.M{
		"type":           1,
		"payment.amount": bson.M{"$gt": 0},
	}

	cursor, err := m.getBillingCollection().Find(context.Background(), filter)
	if err != nil {
		return nil, fmt.Errorf("get all payment error: %v", err)
	}

	var payments []resources.Billing
	if err = cursor.All(context.Background(), &payments); err != nil {
		return nil, fmt.Errorf("get all payment error: %v", err)
	}
	return payments, nil
}

func (m *mongoDB) InitDefaultPropertyTypeLS() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	cursor, err := m.getPropertiesCollection().Find(ctx, bson.M{})
	if err != nil {
		return fmt.Errorf("get all prices error: %v", err)
	}
	var properties []resources.PropertyType
	if err = cursor.All(ctx, &properties); err != nil {
		return fmt.Errorf("get all prices error: %v", err)
	}
	if len(properties) != 0 {
		resources.DefaultPropertyTypeLS = resources.NewPropertyTypeLS(properties)
	}
	return nil
}

func (m *mongoDB) SavePropertyTypes(types []resources.PropertyType) error {
	tps := make([]interface{}, len(types))
	for i, b := range types {
		tps[i] = b
	}
	_, err := m.getPropertiesCollection().InsertMany(context.Background(), tps)
	return err
}

func (m *mongoDB) GenerateBillingData(startTime, endTime time.Time, prols *resources.PropertyTypeLS, ownerToNS map[string][]string) (map[string][]*resources.Billing, error) {
	ownerMonitors, err := m.FetchOwnerMonitorRecords(startTime, endTime, ownerToNS)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch monitor records: %v", err)
	}
	var ownerBillings = make(map[string][]*resources.Billing)
	for owner, monitors := range ownerMonitors {
		billings, err := GenerateBillingDataFromRecords(monitors, prols, startTime, endTime, owner)
		if err != nil {
			return nil, fmt.Errorf("failed to generate billing data: %v", err)
		}
		ownerBillings[owner] = billings
	}
	return ownerBillings, nil
}

func (m *mongoDB) FetchOwnerMonitorRecords(startTime, endTime time.Time, ownerToNS map[string][]string) (map[string][]resources.Monitor, error) {
	// collect all namespaces to avoid repetition
	nsSet := make(map[string]struct{})
	for _, nsList := range ownerToNS {
		for _, ns := range nsList {
			nsSet[ns] = struct{}{}
		}
	}
	namespaces := make([]string, 0, len(nsSet))
	for ns := range nsSet {
		namespaces = append(namespaces, ns)
	}

	// get all matching monitor records from mongodb
	collection := m.getMonitorCollection(startTime)
	filter := bson.M{
		"time":     bson.M{"$gte": startTime, "$lt": endTime},
		"category": bson.M{"$in": namespaces}, // 查询所有涉及的 namespaces
	}

	cursor, err := collection.Find(context.Background(), filter)
	if err != nil {
		return nil, fmt.Errorf("failed to find monitor records: %w", err)
	}
	defer cursor.Close(context.Background())

	// reading mongodb data
	var allRecords []resources.Monitor
	if err := cursor.All(context.Background(), &allRecords); err != nil {
		return nil, fmt.Errorf("failed to decode monitor records: %w", err)
	}

	// build the mapping of owner monitor data
	ownerMonitorRecords := make(map[string][]resources.Monitor)
	for _, record := range allRecords {
		for owner, nsList := range ownerToNS {
			// Only the records of the namespace that belong to the owner are saved
			for _, ns := range nsList {
				if record.Category == ns {
					ownerMonitorRecords[owner] = append(ownerMonitorRecords[owner], record)
					break // avoid duplicate additions
				}
			}
		}
	}

	return ownerMonitorRecords, nil
}

func GenerateBillingDataFromRecords(records []resources.Monitor, prols *resources.PropertyTypeLS, startTime, endTime time.Time, owner string) (billings []*resources.Billing, err error) {
	// Calculate the interval (minutes) to ensure that the divisor is not 0
	minutes := math.Max(endTime.Sub(startTime).Minutes(), 1)

	// 存储分组后的数据
	aggregatedMap := make(map[string]*struct {
		resources.Monitor
		UsedValues map[uint8][]int64
		Count      int64
	})

	// 分组 key 生成规则
	genGroupKey := func(rec resources.Monitor) string {
		return fmt.Sprintf("%s/%d/%s", rec.Category, rec.Type, rec.Name)
	}

	// 遍历所有记录，按分组键聚合
	for _, rec := range records {
		key := genGroupKey(rec)
		if _, ok := aggregatedMap[key]; !ok {
			aggregatedMap[key] = &struct {
				resources.Monitor
				UsedValues map[uint8][]int64
				Count      int64
			}{
				Monitor:    rec,
				UsedValues: make(map[uint8][]int64),
				Count:      0,
			}
		}
		aggregatedMap[key].Count++
		for k, v := range rec.Used {
			//aggregatedMap[key].UsedValues[k] = append(aggregatedMap[key].UsedValues[k], v)
			if _, exists := aggregatedMap[key].UsedValues[k]; !exists {
				aggregatedMap[key].UsedValues[k] = make([]int64, 0, len(records))
			}
			aggregatedMap[key].UsedValues[k] = append(aggregatedMap[key].UsedValues[k], v)
		}
	}

	// 存储最终计费数据
	// map[namespace]map[app_type | parent_type/parent_name][]resources.AppCost
	appCostsMap := make(map[string]map[string][]resources.AppCost)
	nsTypeAmount := make(map[string]map[string]int64)

	calculateFinalUsed := func(values map[uint8][]int64, prols *resources.PropertyTypeLS, minutes float64) map[uint8]int64 {
		finalUsed := make(map[uint8]int64)
		for propKey, vals := range values {
			if prop, ok := prols.EnumMap[propKey]; ok {
				finalUsed[propKey] = computeUsedValue(vals, prop, minutes)
			}
		}
		return finalUsed
	}
	// 计算最终 Used 数据
	for _, agg := range aggregatedMap {
		finalUsed := calculateFinalUsed(agg.UsedValues, prols, minutes)
		// 计算费用
		appCost := resources.AppCost{
			Type:       agg.Type,
			Name:       agg.Name,
			Used:       finalUsed,
			UsedAmount: make(map[uint8]int64),
		}
		var totalAmount int64
		for propKey, usedVal := range finalUsed {
			if prop, ok := prols.EnumMap[propKey]; ok {
				if prop.UnitPrice > 0 {
					feeFloat := float64(usedVal) * prop.UnitPrice
					if feeFloat > math.MaxInt64 {
						return nil, fmt.Errorf("fee calculation overflow: %f", feeFloat)
					}
					fee := int64(math.Ceil(feeFloat))
					appCost.UsedAmount[propKey] = fee
					totalAmount += fee
				}
			}
		}
		if totalAmount == 0 {
			continue
		}
		appCost.Amount = totalAmount
		groupKey := strconv.Itoa(int(agg.Type))
		if agg.ParentType != 0 && agg.ParentName != "" {
			groupKey = strconv.Itoa(int(agg.ParentType)) + "/" + agg.ParentName
		}
		ns := agg.Category
		if _, ok := nsTypeAmount[ns]; !ok {
			nsTypeAmount[ns] = make(map[string]int64)
		}
		nsTypeAmount[ns][groupKey] += totalAmount

		if _, ok := appCostsMap[ns]; !ok {
			appCostsMap[ns] = make(map[string][]resources.AppCost)
		}
		appCostsMap[ns][groupKey] = append(appCostsMap[ns][groupKey], appCost)
	}
	billings = make([]*resources.Billing, 0)

	// 生成 Billing 数据
	for ns, appCostMap := range appCostsMap {
		for tp, appCostList := range appCostMap {
			amount := nsTypeAmount[ns][tp]
			if amount <= 0 {
				continue
			}
			id, err := gonanoid.New(12)
			if err != nil {
				return nil, fmt.Errorf("generate billing id error: %v", err)
			}
			parts := strings.Split(tp, "/")
			appType, _ := strconv.Atoi(parts[0])
			appName := ""
			if len(parts) > 1 {
				appName = parts[1]
			}
			billings = append(billings, &resources.Billing{
				OrderID:   id,
				Type:      Consumption,
				Namespace: ns,
				AppType:   uint8(appType),
				AppName:   appName,
				AppCosts:  appCostList,
				Amount:    amount,
				Owner:     owner,
				Time:      endTime,
				Status:    resources.Settled,
			})
		}
	}
	return billings, nil
}

func computeUsedValue(usedValues []int64, prop resources.PropertyType, minutes float64) int64 {
	switch prop.PriceType {
	case resources.DIF:
		var maxVal int64 = -math.MaxInt64
		var minVal int64 = math.MaxInt64
		for _, v := range usedValues {
			if v > maxVal {
				maxVal = v
			}
			if v != 0 && v < minVal {
				minVal = v
			}
		}
		if maxVal > minVal {
			return maxVal - minVal
		}
		return 0
	case resources.SUM:
		var sum int64
		for _, v := range usedValues {
			sum += v
		}
		return sum
	default:
		var sum int64
		for _, v := range usedValues {
			sum += v
		}
		return int64(math.Round(float64(sum) / minutes))
	}
}

func (m *mongoDB) GetUpdateTimeForCategoryAndPropertyFromMetering(category string, property string) (time.Time, error) {
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

func (m *mongoDB) GetBillingCount(accountType common.Type, startTime, endTime time.Time) (count, amount int64, err error) {
	pipeline := bson.A{
		bson.M{
			"$match": bson.M{
				"type": accountType,
				"time": bson.M{
					"$gte": startTime,
					"$lte": endTime,
				},
			},
		},
		bson.M{
			"$group": bson.M{
				"_id":    nil,
				"count":  bson.M{"$sum": 1},
				"amount": bson.M{"$sum": "$amount"},
			},
		},
	}

	cursor, err := m.getBillingCollection().Aggregate(context.Background(), pipeline)
	if err != nil {
		return 0, 0, err
	}
	defer cursor.Close(context.Background())

	var result struct {
		Count  int64 `bson:"count"`
		Amount int64 `bson:"amount"`
	}

	if cursor.Next(context.Background()) {
		if err := cursor.Decode(&result); err != nil {
			return 0, 0, fmt.Errorf("failed to decode aggregation result: %w", err)
		}
	}

	return result.Count, result.Amount, nil
}

func (m *mongoDB) getMeteringCollection() *mongo.Collection {
	return m.Client.Database(m.AccountDB).Collection(m.MeteringConn)
}

func (m *mongoDB) getMonitorCollection(collTime time.Time) *mongo.Collection {
	// 2020-12-01 00:00:00 - 2020-12-01 23:59:59
	return m.Client.Database(m.AccountDB).Collection(m.getMonitorCollectionName(collTime))
}

func (m *mongoDB) getMonitorCollectionName(collTime time.Time) string {
	// Calculate the suffix by day, for example, the suffix on the first day of 202012 is 20201201
	return fmt.Sprintf("%s_%s", m.MonitorConnPrefix, collTime.Format("20060102"))
}

func (m *mongoDB) getBillingCollection() *mongo.Collection {
	return m.Client.Database(m.AccountDB).Collection(m.BillingConn)
}
func (m *mongoDB) getObjTrafficCollection() *mongo.Collection {
	return m.Client.Database(m.AccountDB).Collection(m.ObjTrafficConn)
}

func (m *mongoDB) getPropertiesCollection() *mongo.Collection {
	return m.Client.Database(m.AccountDB).Collection(m.PropertiesConn)
}

func (m *mongoDB) CreateBillingIfNotExist() error {
	if exist, err := m.collectionExist(m.AccountDB, m.BillingConn); exist || err != nil {
		return err
	}
	ctx := context.Background()
	err := m.Client.Database(m.AccountDB).CreateCollection(ctx, m.BillingConn)
	if err != nil {
		return fmt.Errorf("failed to create collection for billing: %w", err)
	}

	// create index
	_, err = m.getBillingCollection().Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			// unique index owner order_id
			Keys:    bson.D{primitive.E{Key: "owner", Value: 1}, primitive.E{Key: "order_id", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			// owner + time + type indexes
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
func (m *mongoDB) CreateMonitorTimeSeriesIfNotExist(collTime time.Time) error {
	return m.CreateTimeSeriesIfNotExist(m.AccountDB, m.getMonitorCollectionName(collTime))
}

func (m *mongoDB) CreateTimeSeriesIfNotExist(dbName, collectionName string) error {
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

func (m *mongoDB) CreateTTLTrafficTimeSeries() error {
	// Check if the collection already exists
	if exist, err := m.collectionExist(m.AccountDB, m.ObjTrafficConn); exist || err != nil {
		return err
	}
	// If the collection does not exist, create it
	cmd := bson.D{
		primitive.E{Key: "create", Value: m.ObjTrafficConn},
		primitive.E{Key: "timeseries", Value: bson.D{{Key: "timeField", Value: "time"}}},
		//default ttl set 30 days
		primitive.E{Key: "expireAfterSeconds", Value: 30 * 24 * 60 * 60},
	}
	return m.Client.Database(m.AccountDB).RunCommand(context.TODO(), cmd).Err()
}

func (m *mongoDB) DropMonitorCollectionsOlderThan(days int) error {
	db := m.Client.Database(m.AccountDB)
	// Get the current time minus the number of days
	cutoffDate := time.Now().UTC().AddDate(0, 0, -days)
	cutoffName := m.getMonitorCollectionName(cutoffDate)

	collections, err := db.ListCollectionNames(context.Background(), bson.M{})
	if err != nil {
		return err
	}
	for i := range collections {
		// Check if the collection name starts with the prefix and is older than the cutoff date
		if strings.HasPrefix(collections[i], m.MonitorConnPrefix) && collections[i] < cutoffName {
			if err := db.Collection(collections[i]).Drop(context.TODO()); err != nil {
				return err
			}
			logger.Info("dropped collection: ", collections[i])
		}
	}
	return nil
}

func (m *mongoDB) collectionExist(dbName, collectionName string) (bool, error) {
	// Check if the collection already exists
	collections, err := m.Client.Database(dbName).ListCollectionNames(context.Background(), bson.M{"name": collectionName})
	return len(collections) > 0, err
}

func NewMongoInterface(ctx context.Context, URL string) (database.Interface, error) {
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(URL))
	if err != nil {
		return nil, err
	}
	err = client.Ping(ctx, nil)
	return &mongoDB{
		Client:            client,
		AccountDB:         env.GetEnvWithDefault(EnvAccountDBName, DefaultAccountDBName),
		TrafficDB:         env.GetEnvWithDefault(EnvTrafficDBName, DefaultTrafficDBName),
		CvmDB:             env.GetEnvWithDefault(EnvCVMDBName, DefaultCVMDBName),
		AuthDB:            DefaultAuthDBName,
		UserConn:          DefaultUserConn,
		MeteringConn:      DefaultMeteringConn,
		MonitorConnPrefix: DefaultMonitorConn,
		BillingConn:       DefaultBillingConn,
		ObjTrafficConn:    DefaultObjTrafficConn,
		PropertiesConn:    DefaultPropertiesConn,
		TrafficConn:       env.GetEnvWithDefault(EnvTrafficConn, DefaultTrafficConn),
		CvmConn:           env.GetEnvWithDefault(EnvCVMConn, DefaultCVMConn),
	}, err
}
