package dao

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/labring/sealos/controllers/pkg/utils/env"

	"github.com/goccy/go-json"

	"github.com/labring/sealos/service/account/helper"
)

type Config struct {
	LocalRegionDomain string   `json:"localRegionDomain"`
	Regions           []Region `json:"regions"`
	InvoiceToken      string   `json:"invoiceToken"`
}

type Region struct {
	Domain     string `json:"domain"`
	AccountSvc string `json:"accountSvc"`
	UID        string `json:"uid"`
	// zh: region name, en: region name
	Name map[string]string `json:"name"`
}

var (
	DBClient    Interface
	JwtMgr      *helper.JWTManager
	Cfg         *Config
	BillingTask *helper.TaskQueue
	Debug       bool
)

func Init(ctx context.Context) error {
	BillingTask = helper.NewTaskQueue(ctx, env.GetIntEnvWithDefault("ACTIVE_BILLING_TASK_WORKER_COUNT", 10), env.GetIntEnvWithDefault("ACTIVE_BILLING_TASK_QUEUE_SIZE", 10000))
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
	Debug = os.Getenv("DEBUG") == "true"
	DBClient, err = NewAccountInterface(mongoURI, globalCockroach, localCockroach)
	if err != nil {
		return err
	}
	if _, err = DBClient.GetProperties(); err != nil {
		return fmt.Errorf("get properties error: %v", err)
	}

	file := helper.ConfigPath
	Cfg = &Config{} // Initialize Cfg regardless of file existence
	if _, err := os.Stat(file); err == nil {
		data, err := os.ReadFile(file)
		if err != nil {
			return fmt.Errorf("read config file error: %v", err)
		}
		fmt.Printf("config file found, use config file: \n%s\n", file)

		// json unmarshal
		if err = json.Unmarshal(data, Cfg); err != nil {
			return fmt.Errorf("unmarshal config file error: %v", err)
		}
	}
	if len(Cfg.Regions) == 0 {
		regions, err := DBClient.GetRegions()
		if err != nil {
			return fmt.Errorf("get regions error: %v", err)
		}
		Cfg = &Config{
			Regions: make([]Region, 0),
		}
		for i := range regions {
			Cfg.Regions = append(Cfg.Regions, Region{
				Domain:     regions[i].Domain,
				AccountSvc: "account-api." + regions[i].Domain,
				UID:        regions[i].UID.String(),
				Name: map[string]string{
					"zh": regions[i].DisplayName,
					"en": regions[i].DisplayName,
				},
			})
		}
	}
	Cfg.LocalRegionDomain = DBClient.GetLocalRegion().Domain
	fmt.Println("region-info: ", Cfg)
	jwtSecret := os.Getenv(helper.EnvJwtSecret)
	if jwtSecret == "" {
		return fmt.Errorf("empty jwt secret env: %s", helper.EnvJwtSecret)
	}
	JwtMgr = helper.NewJWTManager(os.Getenv(helper.EnvJwtSecret), time.Minute*30)
	return nil
}
