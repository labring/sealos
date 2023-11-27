package mongo

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"

	"github.com/labring/sealos/controllers/pkg/types"
	"go.mongodb.org/mongo-driver/mongo"
)

func (m *mongoDB) GetUser(name string) (*types.User, error) {
	collection := m.getUserCollection()
	if collection == nil {
		return nil, fmt.Errorf("failed to get user collection")
	}
	var user types.User
	err := collection.FindOne(context.Background(), bson.M{"k8s_users.name": name}).Decode(&user)
	if err != nil {
		return nil, fmt.Errorf("failed to find user: error = %v", err)
	}
	return &user, nil
}

func (m *mongoDB) getUserCollection() *mongo.Collection {
	return m.Client.Database(m.AuthDB).Collection(m.UserConn)
}
