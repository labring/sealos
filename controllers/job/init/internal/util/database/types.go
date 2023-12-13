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

func (u *User) Exist(ctx context.Context, collection *mongo.Collection) (bool, error) {
	filter := &bson.M{"password_user": u.PasswordUser}
	user := &User{}
	err := collection.FindOne(ctx, filter).Decode(user)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}
