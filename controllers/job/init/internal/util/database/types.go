package database

import (
	"context"
	"errors"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// User struct in mongoDB.
type User struct {
	UID          string    `bson:"uid" json:"uid"`
	Name         string    `bson:"name" json:"name"`
	PasswordUser string    `bson:"password_user" json:"password_user"`
	Password     string    `bson:"password" json:"password"`
	CreatedTime  string    `bson:"created_time" json:"created_time"`
	K8sUsers     []K8sUser `bson:"k8s_users" json:"k8s_users"`
}

type K8sUser struct {
	Name string `bson:"name" json:"name"`
}

const (
	DefaultAdminUserName = "admin"
	DefaultAdminPassword = "sealos2023"
)

func (u *User) IsExists(ctx context.Context, collection *mongo.Collection) (bool, error) {
	filter := &bson.M{"password_user": u.PasswordUser}
	user := &User{}
	err := collection.FindOne(ctx, filter).Decode(user)
	if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
		return false, err
	}
	return true, nil
}
