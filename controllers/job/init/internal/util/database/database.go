package database

import (
	"context"
	"os"

	"go.mongodb.org/mongo-driver/mongo"
	mongoOptions "go.mongodb.org/mongo-driver/mongo/options"
)

var (
	mongoUserCollection string
	mongoURI            string
)

func init() {
	mongoURI = os.Getenv("MONGO_URI")
	mongoUserCollection = os.Getenv("MONGO_USER_COL")
	if mongoUserCollection == "" {
		mongoUserCollection = "user"
	}
}

func InitMongoDB(ctx context.Context) (*mongo.Client, error) {
	client, err := mongo.Connect(ctx, mongoOptions.Client().ApplyURI(mongoURI))
	if err != nil || client.Ping(ctx, nil) != nil {
		return nil, err
	}
	return client, nil
}
