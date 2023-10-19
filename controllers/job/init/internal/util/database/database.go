package database

import (
	"context"
	"os"

	"go.mongodb.org/mongo-driver/mongo"
	mongoOptions "go.mongodb.org/mongo-driver/mongo/options"
)

var (
	mongoUserCollection string
	mongoUri            string
)

func init() {
	mongoUri = os.Getenv("MONGO_URI")
	mongoUserCollection = os.Getenv("MONGO_USER_COL")
	if mongoUserCollection == "" {
		mongoUserCollection = "user"
	}
}

func InitMongoDB(ctx context.Context) (*mongo.Client, error) {
	client, err := mongo.Connect(ctx, mongoOptions.Client().ApplyURI(mongoUri))
	if err != nil || client.Ping(ctx, nil) != nil {
		return nil, err
	}
	return client, nil
}
