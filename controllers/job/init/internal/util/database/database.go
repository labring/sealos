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
	"os"

	"go.mongodb.org/mongo-driver/mongo"
	mongoOptions "go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/x/mongo/driver/connstring"
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
	} else {
		mongoUserDatabase = cs.Database
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
