package dao

import (
	"os"

	"github.com/labring/sealos/service/account/helper"
)

var DBClient Interface

func InitDB() error {
	var err error
	DBClient, err = NewMongoInterface(os.Getenv(helper.EnvMongoURI))
	return err
}
