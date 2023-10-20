package database

import (
	"context"
	"go.mongodb.org/mongo-driver/x/mongo/driver/connstring"
	"os"

	"go.mongodb.org/mongo-driver/mongo"
	mongoOptions "go.mongodb.org/mongo-driver/mongo/options"
)

var (
	mongoUserDatabase   string
	mongoUserCollection string
	mongoURI            string
)

func init() {
	mongoURI = os.Getenv("MONGO_URI")
	mongoUserCollection = os.Getenv("MONGO_USER_COL")
	if mongoUserCollection == "" {
		mongoUserCollection = "user"
	}
	cs, _ := connstring.ParseAndValidate(mongoURI)
	if cs.Database == "" {
		mongoUserDatabase = "sealos-auth"
	}
}

func InitMongoDB(ctx context.Context) (*mongo.Client, error) {
	client, err := mongo.Connect(ctx, mongoOptions.Client().ApplyURI(mongoURI))
	if err != nil {
		return nil, err
	}
	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}
	return client, nil
}
