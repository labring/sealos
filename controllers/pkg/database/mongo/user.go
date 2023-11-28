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

package mongo

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"

	"go.mongodb.org/mongo-driver/mongo"

	"github.com/labring/sealos/controllers/pkg/types"
)

func (m *mongoDB) GetUser(name string) (*types.User, error) {
	collection := m.getUserCollection()
	if collection == nil {
		return nil, fmt.Errorf("failed to get user collection")
	}
	var user types.User
	err := collection.FindOne(context.Background(), bson.M{"k8s_users.name": name}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to find user: error = %v", err)
	}
	return &user, nil
}

func (m *mongoDB) getUserCollection() *mongo.Collection {
	return m.Client.Database(m.AuthDB).Collection(m.UserConn)
}
