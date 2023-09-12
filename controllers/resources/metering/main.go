package main

import (
	"context"
	"fmt"
	"math"
	"os"
	"os/signal"
	"syscall"
	"time"

	v1 "github.com/prometheus/client_golang/api/prometheus/v1"

	"github.com/labring/sealos/controllers/pkg/prometheus"

	"github.com/labring/sealos/controllers/pkg/common"
	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/utils"

	"github.com/labring/sealos/pkg/utils/flags"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/retry"
	"github.com/spf13/cobra"
)

type Config struct {
	// mongodb connect url
	MongoConnectURI    string
	MongoUsername      string
	MongoPassword      string
	RetentionDay       int64
	PermanentRetention bool
	PrometheusURL      string
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
	if !config.PermanentRetention {
		ticker := time.NewTicker(24 * time.Hour)
		go func() {
			for range ticker.C {
				if err := DropMonitorCollectionOlder(); err != nil {
					logger.Error("Failed to drop monitor collection older than %d days: %v", config.RetentionDay, err)
				}
			}
		}()
	}

	<-ctx.Done()
	logger.Info("program exit")
}

func DropMonitorCollectionOlder() error {
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
	return dbClient.DropMonitorCollectionsOlderThan(int(config.RetentionDay))
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
			logger.Warn("disconnect mongo client failed: %v", err)
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
	// network traffic
	netPrice, exist := prices[common.NetWork]
	if config.PrometheusURL != "" && exist {
		if err = handleNetworkTraffic(dbClient, config, netPrice, startTime, endTime); err != nil {
			logger.Error("failed to handle network traffic: %v", err)
		}
	}

	// create tomorrow monitor time series
	if err := CreateMonitorTimeSeries(dbClient, now.Add(24*time.Hour)); err != nil {
		logger.Debug("failed to create monitor time series: %v", err)
	}
	return nil
}

func handleNetworkTraffic(dbClient database.Interface, config *Config, netPrice common.Price, startTime, endTime time.Time) error {
	prom, err := prometheus.NewPrometheus(config.PrometheusURL)
	if err != nil {
		return fmt.Errorf("failed to new prometheus client: %v", err)
	}

	queryParams := prometheus.QueryParams{
		Range: &v1.Range{
			Start: startTime,
			End:   endTime,
			Step:  time.Hour,
		},
	}
	metering, err := queryNetworkTraffic(prom, queryParams)
	if err != nil {
		return fmt.Errorf("failed to query all network traffic: %v", err)
	}

	return calculateAndInsertData(dbClient, metering, netPrice, endTime)
}

func queryNetworkTraffic(prom prometheus.Interface, queryParams prometheus.QueryParams) ([]*common.Metering, error) {
	return prom.QueryAllNSTraffics(queryParams)
}

func calculateAndInsertData(dbClient database.Interface, metering []*common.Metering, netPrice common.Price, endTime time.Time) error {
	for _, meter := range metering {
		/*		meter.Value = calculateValue(meter.Value)
				meter.Amount = meter.Value * netPrice.Price*/
		meter.Amount = calculateAmount(netPrice, meter.Value)
		if meter.Amount == 0 {
			continue
		}
		meter.Time = endTime
		if err := dbClient.InsertMeteringData(context.Background(), meter); err != nil {
			return fmt.Errorf("failed to insert metering data: %v", err)
		}
	}
	return nil
}

func calculateAmount(netPrice common.Price, value int64) int64 {
	return int64(math.Ceil(float64(netPrice.Price) / float64(1024*1024) * float64(value)))
}

//func calculateValue(value int64) int64 {
//	return int64(math.Ceil(
//		float64(resource.NewQuantity(value, resource.BinarySI).MilliValue()) /
//			float64(common.PricesUnit[common.NetWork].MilliValue())))
//}

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
		MongoConnectURI:    os.Getenv(database.MongoURI),
		MongoUsername:      os.Getenv(database.MongoUsername),
		MongoPassword:      os.Getenv(database.MongoPassword),
		RetentionDay:       utils.GetInt64EnvWithDefault(database.RetentionDay, database.DefaultRetentionDay),
		PermanentRetention: os.Getenv(database.PermanentRetention) == "true",
		PrometheusURL:      os.Getenv("PROM_URL"),
	}
}
