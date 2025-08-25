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

	"github.com/labring/sealos/controllers/license/internal/util/meta"
	"github.com/labring/sealos/controllers/pkg/utils/logger"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	mongoOptions "go.mongodb.org/mongo-driver/mongo/options"
)

type DataBase struct {
	URI    string
	Client *mongo.Client

	licenseCollection   *mongo.Collection
	clusterIDCollection *mongo.Collection
}

const (
	DefaultLicenseDataBase     = "sealos-license"
	DefaultLicenseCollection   = "license"
	DefaultClusterIDCollection = "cluster-id"
)

func New(ctx context.Context, uri string) (*DataBase, error) {
	client, err := mongo.Connect(ctx, mongoOptions.Client().ApplyURI(uri))
	if err != nil {
		return &DataBase{}, err
	}
	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}
	return &DataBase{
		URI:                 uri,
		Client:              client,
		licenseCollection:   client.Database(DefaultLicenseDataBase).Collection(DefaultLicenseCollection),
		clusterIDCollection: client.Database(DefaultLicenseDataBase).Collection(DefaultClusterIDCollection),
	}, nil
}

func (db *DataBase) StoreLicenseMeta(ctx context.Context, meta *meta.Meta) error {
	_, err := db.licenseCollection.InsertOne(ctx, meta)
	return err
}

func (db *DataBase) GetLicenseMeta(ctx context.Context, token string) (*meta.Meta, error) {
	filter := bson.M{"token": token}
	lic := &meta.Meta{}
	err := db.licenseCollection.FindOne(ctx, filter).Decode(lic)
	return lic, err
}

func (db *DataBase) GetClusterID(ctx context.Context) (string, error) {
	var result struct {
		ClusterID string `bson:"cluster-id"`
	}
	err := db.licenseCollection.FindOne(ctx, bson.M{}).Decode(&result)
	if err != nil {
		return "", err
	}
	return result.ClusterID, nil
}

func (db *DataBase) StoreClusterID(ctx context.Context, clusterID string) error {
	document := bson.M{"cluster-id": clusterID}
	_, err := db.licenseCollection.InsertOne(ctx, document)
	if err != nil {
		return err
	}
	return nil
}

func (db *DataBase) Disconnect(ctx context.Context) {
	err := db.Client.Disconnect(ctx)
	if err != nil {
		logger.Error(err, "disconnect from database failed")
		return
	}
}
