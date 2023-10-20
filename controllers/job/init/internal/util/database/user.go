package database

import (
	"context"
	"fmt"
	"time"

	"github.com/labring/sealos/controllers/job/init/internal/util/errors"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/job/init/internal/util/controller"
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
	hashedPassword, err := hashPassword(DefaultAdminPassword)
	if err != nil {
		return nil, err
	}
	return newUser(uuid.New().String(), DefaultAdminUserName, DefaultAdminUserName, hashedPassword, controller.DefaultAdminUserName), nil
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
