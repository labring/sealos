package database

import (
	"context"
	"fmt"
	"os"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	mongoOptions "go.mongodb.org/mongo-driver/mongo/options"
)

func InitMongoDB(ctx context.Context) (*mongo.Client, error) {
	var client *mongo.Client
	var err error
	MongoURI := os.Getenv("MONGO_URI")
	clientOptions := mongoOptions.Client().ApplyURI(MongoURI)
	client, err = mongo.Connect(ctx, clientOptions)
	if err != nil {
		return nil, err
	}
	err = client.Ping(ctx, nil)
	if err != nil {
		return client, err
	}
	if err != nil {
		return nil, fmt.Errorf("failed to connect to mongo: %w", err)
	}
	return client, nil

}

func IsExists(ctx context.Context, collection *mongo.Collection) bool {
	filter := bson.M{"password_user": DefaultUser}
	var existingUser User
	err := collection.FindOne(ctx, filter).Decode(&existingUser)
	return err == nil
}
