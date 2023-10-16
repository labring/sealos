package database

import (
	"context"
	"time"

	licenseUtil "github.com/labring/sealos/controllers/license/internal/util/license"
	"github.com/labring/sealos/controllers/pkg/database"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	mongoOptions "go.mongodb.org/mongo-driver/mongo/options"
)

// TODO fix this
// get all license history function

type DataBase struct {
	URI     string
	Client  *mongo.Client
	DBName  string
	COLName string
}

const DefaultColForLicense = "license"

func (db *DataBase) StoreLicense(license licenseUtil.License) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	document := bson.M{
		"token":      license.Token,
		"createTime": license.CreateTime,
		"payload":    license.Payload,
	}
	_, err := db.Client.Database(db.DBName).Collection(db.COLName).InsertOne(ctx, document)
	return err
}

func (db *DataBase) GetLicense(token string) (licenseUtil.License, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	filter := bson.M{"token": token}
	license := licenseUtil.License{}
	err := db.Client.Database(db.DBName).Collection(db.COLName).FindOne(ctx, filter).Decode(&license)
	return license, err
}

func (db *DataBase) Disconnect() error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	return db.Client.Disconnect(ctx)
}

func NewDataBase(uri string) (DataBase, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	clientOptions := mongoOptions.Client().ApplyURI(uri)
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return DataBase{}, err
	}
	return DataBase{
		URI:     uri,
		Client:  client,
		DBName:  database.DefaultDBName,
		COLName: DefaultColForLicense,
	}, nil
}
