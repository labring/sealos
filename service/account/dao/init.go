package dao

import (
	"os"

	"github.com/labring/sealos/service/account/helper"
)

var DbClient Interface

func InitDB() error {
	var err error
	DbClient, err = NewMongoInterface(os.Getenv(helper.ENV_MONGO_URI))
	return err
}
