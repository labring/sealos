package dao

import (
	"context"
	"fmt"
	"strconv"
	"time"

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
	GetCostAmount(user string, startTime, endTime time.Time) (common.TimeCostsMap, error)
}

type MongoDB struct {
	Client         *mongo.Client
	AccountDBName  string
	BillingConn    string
	PropertiesConn string
	Properties     *resources.PropertyTypeLS
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
			UnitPrice: types.ViewPrice,
			Unit:      types.UnitString,
			Alias:     types.Alias,
		}
		propertiesQuery = append(propertiesQuery, property)
	}
	return propertiesQuery, nil
}

func (m *MongoDB) GetCostAmount(user string, startTime, endTime time.Time) (common.TimeCostsMap, error) {
	filter := bson.M{
		"type": 0,
		"time": bson.M{
			"$gte": startTime,
			"$lte": endTime,
		},
		"owner": user,
	}
	cursor, err := m.getBillingCollection().Find(context.Background(), filter)
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

func NewMongoInterface(url string) (Interface, error) {
	client, err := mongo.Connect(context.Background(), options.Client().ApplyURI(url))
	if err != nil {
		return nil, err
	}
	err = client.Ping(context.Background(), nil)
	return &MongoDB{
		Client:         client,
		AccountDBName:  "sealos-resources",
		BillingConn:    "billing",
		PropertiesConn: "properties",
	}, err
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
