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
	"fmt"
	"time"

	"github.com/labring/sealos/controllers/job/init/internal/util/common"
	"github.com/labring/sealos/controllers/job/init/internal/util/controller"
	"github.com/labring/sealos/controllers/job/init/internal/util/errors"
	"github.com/labring/sealos/controllers/pkg/utils/logger"
)

func PresetAdminUser(ctx context.Context) error {
	//init mongodb database
	client, err := InitMongoDB(ctx)
	if err != nil {
		return err
	}

	defer func() {
		if client == nil {
			logger.Error(fmt.Errorf("mongodb client is nil"), "disconnect mongodb client failed")
			return
		}
		err := client.Disconnect(ctx)
		if err != nil {
			logger.Error(err, "disconnect mongodb client failed")
			return
		}
	}()

	collection := client.Database(mongoUserDatabase).Collection(mongoUserCollection)

	// create admin user
	user, err := newAdminUser()
	if err != nil {
		return err
	}

	// check if the user already exists
	exist, err := user.Exist(ctx, collection)
	if err != nil {
		return err
	}
	if exist {
		return errors.ErrAdminExists
	}

	// insert root user
	if _, err := collection.InsertOne(ctx, user); err != nil {
		return err
	}
	return nil
}

func newAdminUser() (*User, error) {
	return newUser(common.AdminUID(), DefaultAdminUserName, DefaultAdminUserName, hashPassword(DefaultAdminPassword), controller.DefaultAdminUserName), nil
}

func newUser(uid, name, passwordUser, hashedPassword, k8sUser string) *User {
	return &User{
		UID:          uid,
		Name:         name,
		PasswordUser: passwordUser,
		Password:     hashedPassword,
		// to iso string
		CreatedTime: time.Now().Format(time.RFC3339),
		K8sUsers: []K8sUser{
			{
				Name: k8sUser,
			},
		},
	}
}
