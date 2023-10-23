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

	licenseCollection *mongo.Collection
}

const (
	DefaultLicenseDataBase   = "sealos-license"
	DefaultLicenseCollection = "license"
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
		URI:               uri,
		Client:            client,
		licenseCollection: client.Database(DefaultLicenseDataBase).Collection(DefaultLicenseCollection),
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

func (db *DataBase) Disconnect(ctx context.Context) {
	err := db.Client.Disconnect(ctx)
	if err != nil {
		logger.Error(err, "disconnect from database failed")
		return
	}
}
