/*
Copyright 2023.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package main

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/licenseissuer/internal/controller/util"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	mongoOptions "go.mongodb.org/mongo-driver/mongo/options"
	ctrl "sigs.k8s.io/controller-runtime"
)

const maxRetry = 5
const MaxRetryForConnectDB = 10

var logger = ctrl.Log.WithName("PresetWork")

func main() {
	var err error
	options := util.GetOptions()
	for cnt := 0; cnt < maxRetry; cnt++ {
		err = presetRootUser(options, context.Background())
		if err != nil {
			time.Sleep(time.Minute)
			continue
		}
		break
	}
	if err != nil {
		logger.Error(err, "failed to preset root user")
		os.Exit(1)
	}
	logger.Info("preset root user successfully")
}

const (
	// pre-defined user name and password
	defaultuser     = "root"
	defaultPassword = "sealos2023"

	// kubernetes default user cr is admin
	// it is corresponding to the root account
	defaultK8sUser = "admin"

	// the default db and collection of mongodb to store user information
	defaultDB         = "test"
	defaultCollection = "user"
)

type K8sUser struct {
	Name string `bson:"name" json:"name"`
}

// the following code is the struct of user stored in mongoDB.
type User struct {
	UID          string    `bson:"uid" json:"uid"`
	Name         string    `bson:"name" json:"name"`
	PasswordUser string    `bson:"password_user" json:"password_user"`
	Password     string    `bson:"password" json:"password"`
	CreatedTime  string    `bson:"created_time" json:"created_time"`
	K8sUsers     []K8sUser `bson:"k8s_users" json:"k8s_users"`
}

func newUser(uid, name, passwordUser, password, k8sUser string) User {
	return User{
		UID:          uid,
		Name:         name,
		PasswordUser: passwordUser,
		Password:     password,
		// to iso string
		CreatedTime: time.Now().Format(time.RFC3339),
		K8sUsers: []K8sUser{
			{
				Name: k8sUser,
			},
		},
	}
}

func presetRootUser(o util.Options, ctx context.Context) error {
	// init mongoDB client
	client, err := initMongoDB(o, ctx)
	if err != nil {
		return fmt.Errorf("failed to init mongoDB: %w", err)
	}
	defer func() {
		err := client.Disconnect(ctx)
		if err != nil {
			logger.Error(err, "failed to disconnect mongoDB")
		}
	}()

	// preset root user
	uuid := uuid.New().String()
	passwd := hashPassword(defaultPassword, o.GetEnvOptions().SaltKey)
	user := newUser(uuid, defaultuser, defaultuser, passwd, defaultK8sUser)

	collection := client.Database(defaultDB).Collection(defaultCollection)
	// check if the user already exists
	isExists := preCheck(ctx, collection)
	if isExists {
		logger.Info("root user already exists")
		return nil
	}
	// insert root user
	insertResult, err := collection.InsertOne(context.Background(), user)
	if err != nil {
		logger.Info("insert root user failed")
		return err
	}
	logger.Info("insert root user successfully", "insertedID", insertResult.InsertedID)
	return nil
}

func initMongoDB(o util.Options, ctx context.Context) (*mongo.Client, error) {
	var client *mongo.Client
	var err error
	MongoURI := o.GetEnvOptions().MongoURI
	clientOptions := mongoOptions.Client().ApplyURI(MongoURI)
	for i := 0; i < MaxRetryForConnectDB; i++ {
		client, err = mongo.Connect(ctx, clientOptions)
		if err != nil {
			logger.Error(err, "failed to connect to mongo")
			time.Sleep(5 * time.Second)
			continue
		}
		err = client.Ping(ctx, nil)
		if err != nil {
			logger.Error(err, "failed to ping to mongo")
			time.Sleep(5 * time.Second)
			continue
		}
		logger.Info("connect to mongo successfully")
		break
	}
	if err != nil {
		return nil, fmt.Errorf("failed to connect to mongo: %w", err)
	}
	return client, nil
}

// makesure the user does not exist
func preCheck(ctx context.Context, collection *mongo.Collection) bool {
	filter := bson.M{"password_user": defaultuser}
	var existingUser User
	err := collection.FindOne(ctx, filter).Decode(&existingUser)
	return err == nil
}

// the following code is consistent with the front-end login logic
func hashPassword(password string, key string) string {
	hash := sha256.New()
	validSalt, err := decodeBase64(key)
	if err != nil {
		fmt.Println("Error decoding salt:", err.Error())
		os.Exit(1)
	}
	hash.Write([]byte(password + string(validSalt)))
	return hex.EncodeToString(hash.Sum(nil))
}

func decodeBase64(s string) ([]byte, error) {
	data, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		fmt.Println("Error decoding string:", err.Error())
		return nil, err
	}
	return data, nil
}
