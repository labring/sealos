package dao

import (
	"fmt"
	"os"

	"github.com/labring/sealos/service/account/helper"
)

var DBClient Interface

func InitDB() error {
	var err error
	globalCockroach := os.Getenv(helper.ENVGlobalCockroach)
	if globalCockroach == "" {
		return fmt.Errorf("empty global cockroach uri, please check env: %s", helper.ENVGlobalCockroach)
	}
	localCockroach := os.Getenv(helper.ENVLocalCockroach)
	if localCockroach == "" {
		return fmt.Errorf("empty local cockroach uri, please check env: %s", helper.ENVLocalCockroach)
	}
	mongoURI := os.Getenv(helper.EnvMongoURI)
	if mongoURI == "" {
		return fmt.Errorf("empty mongo uri, please check env: %s", helper.EnvMongoURI)
	}
	fmt.Println("cockroachStr: ", globalCockroach)
	fmt.Println("localRegionStr: ", localCockroach)
	fmt.Println("mongoURI: ", mongoURI)
	DBClient, err = NewAccountInterface(mongoURI, globalCockroach, localCockroach)
	if err != nil {
		return err
	}
	_, err = DBClient.GetProperties()
	return err
}
