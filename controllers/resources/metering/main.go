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

package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/labring/sealos/controllers/pkg/common"

	"github.com/labring/sealos/controllers/pkg/database"

	"github.com/labring/sealos/pkg/utils/flags"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/retry"
	"github.com/spf13/cobra"
)

//var once *sync.Once

type Config struct {
	// mongodb connect url
	MongoConnectURI string
	MongoUsername   string
	MongoPassword   string

	// interval of metering resources
	Interval time.Duration
}

var config *Config

func ResourcesMetering() {
	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		// 信号监听
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh

		logger.Info("Receiving signal, canceling...")
		cancel()
	}()

	// 在启动时执行任务
	logger.Info("start to execute metering resources, time: %v", time.Now().Format("2006-01-02 15:04:05"))
	if err := PreApply(); err != nil {
		logger.Error(err.Error())
		os.Exit(1)
	}
	logger.Info("success first metering resources, time: %v", time.Now().Format("2006-01-02 15:04:05"))

	go func() {
		for {
			// start execution beginning of every hour
			durationToNextHour := time.Until(time.Now().Truncate(time.Hour).Add(time.Hour))

			select {
			case <-time.After(durationToNextHour):
				go func() {
					logger.Debug("Start to execute metering resources, time: %v", time.Now().Format("2006-01-02 15:04:05"))
					if err := retry.Retry(5, time.Minute, executeTask); err != nil {
						logger.Error("Failed to execute task: %v", err)
						return
					}
					logger.Debug("Success metering resources, time: %v", time.Now().Format("2006-01-02 15:04:05"))
				}()
			case <-ctx.Done():
				return
			}
		}
	}()

	<-ctx.Done()
	logger.Info("program exit")
}

func PreApply() error {
	switch {
	case config.MongoConnectURI == "":
		return fmt.Errorf("mongo connect url is empty")
	}
	dbCtx := context.Background()
	dbClient, err := database.NewMongoDB(dbCtx, config.MongoConnectURI)
	if err != nil {
		return fmt.Errorf("connect mongo client failed: %v", err)
	}
	defer func() {
		err := dbClient.Disconnect(dbCtx)
		if err != nil {
			logger.Error("disconnect mongo client failed: %v", err)
		}
	}()

	if err = dbClient.CreateMeteringTimeSeriesIfNotExist(); err != nil {
		logger.Warn("create metering time series failed: %v", err)
	}
	if err = CreateMonitorTimeSeries(dbClient, time.Now().UTC()); err != nil {
		logger.Warn("create monitor time series failed: %v", err)
	}
	return executeTask()
}

func executeTask() error {
	//opts := options.Client().ApplyURI("mongodb://192.168.64.17:27017")
	dbCtx := context.Background()
	dbClient, err := database.NewMongoDB(dbCtx, config.MongoConnectURI)
	if err != nil {
		return fmt.Errorf("connect mongo client failed: %v", err)
	}
	defer func() {
		err := dbClient.Disconnect(dbCtx)
		if err != nil {
			logger.Error("disconnect mongo client failed: %v", err)
		}
	}()
	prices, err := dbClient.GetAllPricesMap()
	if err != nil {
		logger.Error("failed to get all prices map: %v", err)
	}
	//prices is empty, use default price
	if len(prices) == 0 || err != nil {
		prices = common.DefaultPrices
	}
	now := time.Now().UTC()
	startTime := time.Date(now.Year(), now.Month(), now.Day(), now.Hour()-1, 0, 0, 0, time.UTC)
	endTime := time.Date(now.Year(), now.Month(), now.Day(), now.Hour(), 0, 0, 0, time.UTC)
	if err := dbClient.GenerateMeteringData(startTime, endTime, prices); err != nil {
		return fmt.Errorf("failed to generate metering data: %v", err)
	}
	// create tomorrow monitor time series
	if err := CreateMonitorTimeSeries(dbClient, now.Add(24*time.Hour)); err != nil {
		return fmt.Errorf("failed to create monitor time series: %v", err)
	}
	return nil
}

func CreateMonitorTimeSeries(dbClient database.Interface, collTime time.Time) error {
	return dbClient.CreateMonitorTimeSeriesIfNotExist(collTime)
}

func main() {
	Execute()
}

var (
	debug    bool
	showPath bool
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "metering",
	Short: "program for sealos resources metering.",
	// Uncomment the following line if your bare application
	// has an action associated with it:
	//	Run: func(cmd *cobra.Command, args []string) { },
}

// Execute adds all child commands to the root command and sets flags appropriately.
// This is called by main.main(). It only needs to happen once to the rootCmd.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

func newStartCmd() *cobra.Command {
	//type startFlag struct {
	//}
	//var flag startFlag

	startCmd := &cobra.Command{
		Use:   "start",
		Short: "start metering",
		Long:  `start metering`,
		Run: func(cmd *cobra.Command, args []string) {
			flags.PrintFlags(cmd.Flags())
			ResourcesMetering()
		},
	}

	return startCmd
}

func init() {
	cobra.OnInitialize(func() {
		logger.CfgConsoleLogger(debug, showPath)
	})

	rootCmd.PersistentFlags().BoolVar(&debug, "debug", false, "enable debug logger")
	rootCmd.PersistentFlags().BoolVar(&showPath, "show-path", false, "enable show code path")
	rootCmd.AddCommand(newStartCmd())
	config = &Config{
		MongoConnectURI: os.Getenv(database.MongoURI),
		MongoUsername:   os.Getenv(database.MongoUsername),
		MongoPassword:   os.Getenv(database.MongoPassword),
	}
}
