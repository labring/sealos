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
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	mongoOptions "go.mongodb.org/mongo-driver/mongo/options"
)

// mongo db handler
type MongoHandler interface {
	IsExisted(condition bson.M) bool
	FindDoc(condition bson.M) (bson.M, error)
	FindDocs(condition bson.M) ([]bson.M, error)
	UpsertDoc(doc bson.M, filter bson.M) (*mongo.UpdateResult, error)
	InsertIfNotExisted(doc bson.M, filter bson.M) error
	InsertDoc(doc bson.M) error
	Disconnect() error
}

type MongoDB struct {
	DB      *mongoDB
	DBName  string
	COLName string
}

func (m *MongoDB) UpsertDoc(doc bson.M, filter bson.M) (*mongo.UpdateResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	update := bson.M{
		"$set": doc,
	}
	updateOptions := mongoOptions.Update().SetUpsert(true)

	res, err := m.DB.client.Database(m.DBName).Collection(m.COLName).
		UpdateOne(ctx, filter, update, updateOptions)
	return res, err
}

func (m *MongoDB) InsertIfNotExisted(doc bson.M, filter bson.M) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	count, err := m.DB.client.Database(m.DBName).Collection(m.COLName).CountDocuments(ctx, filter)
	if err != nil {
		return err
	}
	if count == 0 {
		_, err := m.DB.client.Database(m.DBName).Collection(m.COLName).InsertOne(ctx, doc)
		return err
	}
	return nil
}

func (m *MongoDB) InsertDoc(doc bson.M) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	_, err := m.DB.client.Database(m.DBName).Collection(m.COLName).InsertOne(ctx, doc)
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

func (m *MongoDB) Disconnect() error {
	if m.DB.client == nil {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return m.DB.client.Disconnect(ctx)
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

func NewMongoDB(dbName string, colName string) MongoHandler {
	return (&MongoDB{
		DB: db,
	}).WithDBName(dbName).WithCOLName(colName)
}

func BsonMFrom(input interface{}) (bson.M, error) {
	bsonBytes, err := bson.Marshal(input)
	if err != nil {
		return nil, err
	}
	var doc bson.M
	err = bson.Unmarshal(bsonBytes, &doc)
	return doc, err
}
