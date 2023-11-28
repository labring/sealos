package dao

import (
	"context"

	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/labring/sealos/service/account/helper"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type Interface interface {
	GetBillingHistoryNamespaceList(req *helper.NamespaceBillingHistoryReq) ([]string, error)
	//GetProperties() (map[string]interface{}, error)
}

type MongoDB struct {
	Client        *mongo.Client
	AccountDBName string
	BillingConn   string
}

func NewMongoInterface(url string) (Interface, error) {
	client, err := mongo.Connect(context.Background(), options.Client().ApplyURI(url))
	if err != nil {
		return nil, err
	}
	err = client.Ping(context.Background(), nil)
	return &MongoDB{
		Client:        client,
		AccountDBName: "sealos-resources",
		BillingConn:   "billing",
	}, err
}

func (m *MongoDB) GetBillingHistoryNamespaceList(req *helper.NamespaceBillingHistoryReq) ([]string, error) {
	filter := bson.M{
		"owner": req.Owner,
	}
	if req.StartTime != req.EndTime {
		filter["time"] = bson.M{
			"$gte": req.StartTime.Time.UTC(),
			"$lte": req.EndTime.Time.UTC(),
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
