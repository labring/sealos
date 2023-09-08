/*
Copyright 2023.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package util

import (
	"context"
	"strconv"
	"time"

	"github.com/labring/sealos/controllers/pkg/common"
	"github.com/labring/sealos/controllers/pkg/crypto"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	mongoOptions "go.mongodb.org/mongo-driver/mongo/options"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// used to bill the cluster usage by the cluster scale

const defaultCryptoKey = "ABf0beBc5gd0C54adF0b1547cF43aCB83"

var CryptoKey = defaultCryptoKey

type ClusterScaleBilling struct {
	tnr TotalNodesResource
}

type billing struct {
	ClusterID  string `json:"clusterID" bson:"clusterID"`
	CreateTime string `json:"createTime" bson:"createTime"`
	TotalFee   int64  `json:"totalFee" bson:"totalFee"`
}

type Prices struct {
	Property string `json:"property" bson:"property"`
	Price    string `json:"price" bson:"price"`
	Detail   string `json:"detail" bson:"detail"`
}

func NewClusterScaleBillingWork() *ClusterScaleBilling {
	return &ClusterScaleBilling{
		tnr: TotalNodesResource{},
	}
}

func (c *ClusterScaleBilling) billingWork(ti *TaskInstance) error {
	var err error
	// get the cluster resource
	err = c.GetClusterResource(ti.ctx, ti.Client)
	if err != nil {
		return err
	}
	// get the cluster billing info
	Prices := c.GetPrices()
	// calculate the billing info
	var fee int64
	for _, v := range Prices {
		switch v.Property {
		case "node":
			nums, _ := strconv.Atoi(c.tnr.TotalNodes)
			fee += int64(nums) * v.Price
		case "cpu":
			fee += c.tnr.TotalCPU.Value() * v.Price
		// case "gpu":
		// 	fee += c.tnr.TotalGPU.Value() * v.Price
		case "memory":
			fee += c.tnr.TotalMemory.Value() * v.Price
		}
	}

	c.tnr = TotalNodesResource{}

	// save the billing info
	uid, _ := GetUID(ti.ctx, ti.Client)

	// save the billing info
	mongoDB := NewMongoDB("cluster", "scale_billing")
	doc := bson.M{
		"clusterID":  uid,
		"createTime": time.Now().Format("2006-01-02"),
		"totalFee":   fee,
	}
	return mongoDB.UpsertDoc(doc, bson.M{"createTime": doc["createTime"]})
}

func (c *ClusterScaleBilling) GetPrices() map[string]common.Price {
	var priceMap map[string]common.Price
	mongoDB := NewMongoDB("cluster", "prices")
	doc, err := mongoDB.FindDocs(bson.M{})
	if err != nil || doc == nil {
		return common.DefaultPrices
	}
	for _, v := range doc {
		var price Prices
		bsonBytes, _ := bson.Marshal(v)
		err = bson.Unmarshal(bsonBytes, &price)
		if err != nil {
			// handle error
			return common.DefaultPrices
		}
		var priceInt64 int64
		priceInt64, err := crypto.DecryptInt64WithKey(price.Price, []byte(CryptoKey))
		if err != nil {
			priceInt64 = common.DefaultPrices[price.Property].Price
		}
		priceMap[price.Property] = common.Price{
			Property: price.Property,
			Price:    priceInt64,
			Detail:   price.Detail,
		}
	}
	return priceMap
}

func (c *ClusterScaleBilling) GetClusterResource(ctx context.Context, client client.Client) error {
	err := GetNodeResource(ctx, client, &c.tnr)
	if err != nil {
		return err
	}
	err = GetPVResource(ctx, client, &c.tnr)
	if err != nil {
		return err
	}
	return nil
}

// mongo db handler
type MongoDocsHandler interface {
	IsExisted(condition bson.M) bool
	FindDoc(condition bson.M) (bson.M, error)
	FindDocs(condition bson.M) ([]bson.M, error)
	UpsertDoc(doc bson.M, filter bson.M) error
}

type MongoDB struct {
	DB      *mongoDB
	DBName  string
	COLName string
}

func (m *MongoDB) UpsertDoc(doc bson.M, filter bson.M) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	update := bson.M{
		"$set": doc,
	}
	updateOptions := mongoOptions.Update().SetUpsert(true)

	_, err := m.DB.client.Database(m.DBName).Collection(m.COLName).
		UpdateOne(ctx, filter, update, updateOptions)
	return err
}

func (m *MongoDB) FindDocs(condition bson.M) ([]bson.M, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	var docs []bson.M
	cursor, err := m.DB.client.Database(m.DBName).Collection(m.COLName).
		Find(ctx, condition)
	if err != nil {
		return nil, err
	}
	err = cursor.All(ctx, &docs)
	return docs, err
}

func (m *MongoDB) FindDoc(condition bson.M) (bson.M, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	var doc bson.M
	err := m.DB.client.Database(m.DBName).Collection(m.COLName).
		FindOne(ctx, condition).Decode(&doc)
	return doc, err
}

func (m *MongoDB) IsExisted(condition bson.M) bool {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	single := m.DB.client.Database(m.DBName).Collection(m.COLName).
		FindOne(ctx, condition)
	if single.Err() == mongo.ErrNoDocuments {
		return false
	}
	return true
}

// the following code is used to init the single mongo client
type mongoDB struct {
	ctx     context.Context
	client  *mongo.Client
	options *mongoOptions.ClientOptions
	uri     string
}

var db *mongoDB = &mongoDB{}

func init() {
	db.ctx = context.Background()
	db.uri = GetOptions().GetEnvOptions().MongoURI
	db.options = mongoOptions.Client().ApplyURI(db.uri)
	var err error
	db.client, err = mongo.Connect(db.ctx, db.options)
	if err != nil {
		panic(err)
	}
}

func InitDB(ctx context.Context) error {
	var err error
	db.client, err = mongo.Connect(ctx, db.options)
	return err
}

func Disconnect(ctx context.Context) error {
	if db.client == nil {
		return nil
	}
	return db.client.Disconnect(ctx)
}

func (m *MongoDB) WithDBName(dbName string) *MongoDB {
	m.DBName = dbName
	return m
}

func (m *MongoDB) WithCOLName(colName string) *MongoDB {
	m.COLName = colName
	return m
}

func NewMongoDB(dbName string, colName string) MongoDocsHandler {
	return (&MongoDB{
		DB: db,
	}).WithDBName(dbName).WithCOLName(colName)
}
