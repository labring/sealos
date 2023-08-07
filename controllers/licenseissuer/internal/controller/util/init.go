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

package util

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"os"
	"time"

	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	mongoOptions "go.mongodb.org/mongo-driver/mongo/options"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
)

const MaxRetryForConnectDB = 5

type RegisterRequest struct {
	UID string `json:"uid"`
}

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

// The following code is used to implement the instance of sub-task which is used to
// initialize the cluster uuid and preset root user for mongoDB
type initTask struct {
	options Options
}

func (t initTask) initWork(instance *TaskInstance) error {
	err := t.register(instance)
	if err != nil {
		instance.logger.Error(err, "failed to register")
		return err
	}
	return nil
}

// 1. preset root user
// 2. check if the cluster has been registered
// 3. register to cloud (if the monitor is enabled)
// 4. store cluster-info to k8s
func (t initTask) register(instance *TaskInstance) error {
	// step 1
	err := t.presetRootUser(instance)
	if err != nil {
		instance.logger.Error(err, "failed to preset root user")
		return err
	}
	ClusterInfo := createClusterInfo()
	// step 2
	// check if the cluster has been registered
	registered, err := t.checkRegister(instance)
	if err != nil {
		instance.logger.Error(err, "failed to check register")
		return err
	}
	if registered {
		instance.logger.Info("cluster has been registered")
		return nil
	}

	// step 3
	// if the monitor is enabled, info will be sent to the cloud.
	if t.options.GetEnvOptions().MonitorConfiguration == "true" {
		err := t.registerToCloud(*ClusterInfo, instance)
		if err != nil {
			instance.logger.Error(err, "failed to register to cloud")
			return err
		}
	}
	// step 4
	// only after register to cloud, the store-behavior will be executed.
	err = instance.Create(instance.ctx, ClusterInfo)
	if err != nil {
		instance.logger.Error(err, "failed to create cluster-info")
	}
	return err
}

// check if the cluster has been registered.
func (t initTask) checkRegister(instance *TaskInstance) (bool, error) {
	info := &corev1.Secret{}
	err := instance.Get(instance.ctx, types.NamespacedName{
		Name:      ClusterInfo,
		Namespace: SealosNamespace,
	}, info)
	if err != nil && apierrors.IsNotFound(err) {
		return false, nil
	}
	return true, err
}

// registerToCloud is used to send info to the cloud.
func (t initTask) registerToCloud(ClusterInfo corev1.Secret, instance *TaskInstance) error {
	urlMap, err := GetURL(instance.ctx, instance.Client)
	if err != nil {
		return fmt.Errorf("failed to get url: %w", err)
	}
	rr := RegisterRequest{
		UID: string(ClusterInfo.Data["uuid"]),
	}
	// send info to cloud
	err = Push(urlMap[RegisterURL], rr)
	if err != nil {
		return fmt.Errorf("failed to write to cloud: %w", err)
	}
	return nil
}

func createClusterInfo() *corev1.Secret {
	uuid := uuid.New().String()
	secret := &corev1.Secret{}
	secret.Name = ClusterInfo
	secret.Namespace = SealosNamespace
	secret.Data = map[string][]byte{
		"uuid": []byte(uuid),
	}
	return secret
}

// presetRootUser is used to preset root user for mongoDB.

func (t initTask) presetRootUser(instance *TaskInstance) error {
	// init mongoDB client
	client, err := t.initMongoDB(instance)
	if err != nil {
		return fmt.Errorf("failed to init mongoDB: %w", err)
	}
	defer func() {
		err := client.Disconnect(instance.ctx)
		if err != nil {
			instance.logger.Error(err, "failed to disconnect mongoDB")
		}
	}()

	// preset root user
	uuid := uuid.New().String()
	passwd := hashPassword(defaultPassword, t.options.GetEnvOptions().SaltKey)
	user := newUser(uuid, defaultuser, defaultuser, passwd, defaultK8sUser)

	collection := client.Database(defaultDB).Collection(defaultCollection)
	// check if the user already exists
	err = preCheck(instance.ctx, client, collection)
	if err != nil {
		instance.logger.Info("root user already exists")
		return err
	}
	// insert root user
	insertResult, err := collection.InsertOne(context.Background(), user)
	if err != nil {
		instance.logger.Info("insert root user failed")
		return err
	}
	instance.logger.Info("insert root user successfully", "insertedID", insertResult.InsertedID)
	return nil
}

// init mongoDB client to preset root user.
func (t initTask) initMongoDB(instance *TaskInstance) (*mongo.Client, error) {
	var client *mongo.Client
	var err error
	MongoURI := t.options.GetEnvOptions().MongoURI
	clientOptions := mongoOptions.Client().ApplyURI(MongoURI)
	for i := 0; i < MaxRetryForConnectDB; i++ {
		client, err = mongo.Connect(instance.ctx, clientOptions)
		if err != nil {
			instance.logger.Error(err, "failed to connect to mongo")
			time.Sleep(5 * time.Second)
			continue
		}
		err = client.Ping(instance.ctx, nil)
		if err != nil {
			instance.logger.Error(err, "failed to ping to mongo")
			time.Sleep(5 * time.Second)
			continue
		}
		instance.logger.Info("connect to mongo successfully")
		break
	}
	if err != nil {
		return nil, fmt.Errorf("failed to connect to mongo: %w", err)
	}
	return client, nil
}

// makesure the user does not exist
func preCheck(ctx context.Context, client *mongo.Client, collection *mongo.Collection) error {
	filter := bson.M{"name": defaultuser}
	var existingUser User
	err := collection.FindOne(ctx, filter).Decode(&existingUser)
	if err != nil {
		return nil
	}
	return fmt.Errorf("user %s already exists", defaultuser)
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
