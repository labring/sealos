package database

import (
	"context"

	"github.com/labring/sealos/controllers/license/internal/util/meta"

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

func New(ctx context.Context, uri string) (DataBase, error) {
	client, err := mongo.Connect(ctx, mongoOptions.Client().ApplyURI(uri))
	if err != nil {
		return DataBase{}, err
	}
	return DataBase{
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

func (db *DataBase) Disconnect(ctx context.Context) error {
	return db.Client.Disconnect(ctx)
}
