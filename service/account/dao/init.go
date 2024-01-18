package dao

import (
	"fmt"
	"os"

	"github.com/labring/sealos/service/account/helper"
)

var DBClient Interface

func InitDB() error {
	var err error
	cockroachStr := os.Getenv(helper.ENVCockroach)
	if cockroachStr == "" {
		return fmt.Errorf("empty cockroach uri, please check env: %s", helper.ENVCockroach)
	}
	localRegionStr := os.Getenv(helper.EnvLocalRegion)
	if localRegionStr == "" {
		return fmt.Errorf("empty local region, please check env: %s", helper.EnvLocalRegion)
	}
	mongoURI := os.Getenv(helper.EnvMongoURI)
	if mongoURI == "" {
		return fmt.Errorf("empty mongo uri, please check env: %s", helper.EnvMongoURI)
	}
	fmt.Println("cockroachStr: ", cockroachStr)
	fmt.Println("localRegionStr: ", localRegionStr)
	fmt.Println("mongoURI: ", mongoURI)
	DBClient, err = NewAccountInterface(mongoURI, cockroachStr, localRegionStr)
	if err != nil {
		return err
	}
	_, err = DBClient.GetProperties()
	return err
}
