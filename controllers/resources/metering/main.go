package main

import (
	"context"
	"fmt"
	"math"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/labring/sealos/controllers/resources/controllers"
	"github.com/labring/sealos/pkg/utils/flags"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/retry"
	"github.com/spf13/cobra"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/sync/errgroup"
)

//var once *sync.Once

type Config struct {
	// mongodb connect url
	MongoConnectURL string
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
	case config.MongoConnectURL == "":
		return fmt.Errorf("mongo connect url is empty")
	case config.MongoUsername == "":
		return fmt.Errorf("mongo username is empty")
	case config.MongoPassword == "":
		return fmt.Errorf("mongo password is empty")
	}
	opts := options.Client().ApplyURI(config.MongoConnectURL).SetAuth(options.Credential{
		Username: config.MongoUsername,
		Password: config.MongoPassword,
	})
	dbCtx := context.Background()
	mongoClient, err := mongo.Connect(dbCtx, opts)
	if err != nil {
		return fmt.Errorf("connect mongo client failed: %v", err)
	}
	defer func() {
		err := mongoClient.Disconnect(dbCtx)
		if err != nil {
			logger.Error("disconnect mongo client failed: %v", err)
		}
	}()
	err = controllers.CreateTimeSeriesTable(mongoClient, controllers.SealosResourcesDBName, controllers.SealosMeteringCollectionName)
	if err != nil {
		logger.Warn("create compound index failed: %v", err)
	}
	return executeTask()
}

func executeTask() error {
	//TODO get mongo connect url from configmap or secret
	opts := options.Client().ApplyURI(config.MongoConnectURL).SetAuth(options.Credential{
		Username: config.MongoUsername,
		Password: config.MongoPassword,
	})
	//opts := options.Client().ApplyURI("mongodb://192.168.64.17:27017")
	dbCtx := context.Background()
	mongoClient, err := mongo.Connect(dbCtx, opts)
	if err != nil {
		return fmt.Errorf("connect mongo client failed: %v", err)
	}
	defer func() {
		err := mongoClient.Disconnect(dbCtx)
		if err != nil {
			logger.Error("disconnect mongo client failed: %v", err)
		}
	}()
	prices, err := controllers.GetAllPricesMap(mongoClient)
	if err != nil {
		return fmt.Errorf("failed to get all prices map: %v", err)
	}
	now := time.Now()
	startTime := time.Date(now.Year(), now.Month(), now.Day(), now.Hour()-1, 0, 0, 0, time.UTC)
	endTime := time.Date(now.Year(), now.Month(), now.Day(), now.Hour(), 0, 0, 0, time.UTC)
	if err := generateMeteringData(mongoClient, startTime, endTime, prices); err != nil {
		return fmt.Errorf("failed to generate metering data: %v", err)
	}
	return nil
}

//func generateMeteringData(client *mongo.Client, startTime, endTime time.Time, prices map[string]controllers.Price) error {
//	monitorCollection := client.Database(controllers.SealosResourcesDBName).Collection(controllers.SealosMonitorCollectionName)
//	meteringCollection := client.Database(controllers.SealosResourcesDBName).Collection(controllers.SealosMeteringCollectionName)
//
//	filter := bson.M{
//		"time": bson.M{
//			"$gte": startTime,
//			"$lt":  endTime,
//		},
//	}
//
//	cursor, err := monitorCollection.Find(context.Background(), filter)
//	if err != nil {
//		return fmt.Errorf("find monitors error: %v", err)
//	}
//
//	var monitors []controllers.Monitor
//	if err = cursor.All(context.Background(), &monitors); err != nil {
//		return fmt.Errorf("get monitors error: %v", err)
//	}
//
//	if len(monitors) == 0 {
//		logger.Error("no monitor data")
//		return nil
//	}
//
//	meteringMap := make(map[string]map[string]int64)
//	countMap := make(map[string]map[string]int64)
//
//	for _, monitor := range monitors {
//		if lastUpdateTime, err := getUpdateTimeForCategoryAndPropertyFromMetering(client, monitor.Category, monitor.Property); err != nil {
//			logger.Debug(err, "get latest update time failed", "category", monitor.Category, "property", monitor.Property)
//		} else if /* skip last update lt 1 hour*/ !lastUpdateTime.Add(time.Hour).Before(startTime) {
//			logger.Debug("Info", "skip metering", "category", monitor.Category, "property", monitor.Property, "lastUpdateTime", lastUpdateTime)
//			continue
//		}
//		if _, ok := meteringMap[monitor.Category]; !ok {
//			meteringMap[monitor.Category] = make(map[string]int64)
//			countMap[monitor.Category] = make(map[string]int64)
//		}
//		meteringMap[monitor.Category][monitor.Property] += monitor.Value
//		countMap[monitor.Category][monitor.Property]++
//	}
//
//	var dataSources []interface{}
//	for category, propertyMap := range meteringMap {
//		for property, totalValue := range propertyMap {
//			count := countMap[category][property]
//			unitValue := math.Ceil(float64(totalValue) / float64(count))
//			metering := &controllers.Metering{
//				Category: category,
//				Property: property,
//				Time:     endTime,
//				Amount:   int64(unitValue * prices[property].Price),
//				Value:    int64(unitValue),
//				Status:   0,
//				Detail:   "",
//			}
//			dataSources = append(dataSources, metering)
//		}
//	}
//	if len(dataSources) == 0 {
//		logger.Warn("no metering resources data")
//		return nil
//	}
//	logger.Info("dataSources: %v", dataSources)
//	_, err = meteringCollection.InsertMany(context.Background(), dataSources)
//	return err
//}

func generateMeteringData(client *mongo.Client, startTime, endTime time.Time, prices map[string]controllers.Price) error {
	monitorCollection := client.Database(controllers.SealosResourcesDBName).Collection(controllers.SealosMonitorCollectionName)
	meteringCollection := client.Database(controllers.SealosResourcesDBName).Collection(controllers.SealosMeteringCollectionName)

	filter := bson.M{
		"time": bson.M{
			"$gte": startTime,
			"$lt":  endTime,
		},
	}
	cursor, err := monitorCollection.Find(context.Background(), filter)
	if err != nil {
		return fmt.Errorf("find monitors error: %v", err)
	}
	defer cursor.Close(context.Background())

	meteringMap := make(map[string]map[string]int64)
	countMap := make(map[string]map[string]int64)
	updateTimeMap := make(map[string]map[string]*time.Time)

	for cursor.Next(context.Background()) {
		var monitor controllers.Monitor
		if err := cursor.Decode(&monitor); err != nil {
			return fmt.Errorf("decode monitor error: %v", err)
		}

		if _, ok := updateTimeMap[monitor.Category]; !ok {
			updateTimeMap[monitor.Category] = make(map[string]*time.Time)
		}
		if _, ok := updateTimeMap[monitor.Category][monitor.Property]; !ok {
			lastUpdateTime, err := getUpdateTimeForCategoryAndPropertyFromMetering(client, monitor.Category, monitor.Property)
			if err != nil {
				logger.Debug(err, "get latest update time failed", "category", monitor.Category, "property", monitor.Property)
			}
			updateTimeMap[monitor.Category][monitor.Property] = &lastUpdateTime
		}
		lastUpdateTime := updateTimeMap[monitor.Category][monitor.Property].UTC()

		if /* skip last update lte 1 hour*/ lastUpdateTime.Before(startTime) || lastUpdateTime.Equal(startTime) {
			if _, ok := meteringMap[monitor.Category]; !ok {
				meteringMap[monitor.Category] = make(map[string]int64)
				countMap[monitor.Category] = make(map[string]int64)
			}

			meteringMap[monitor.Category][monitor.Property] += monitor.Value
			countMap[monitor.Category][monitor.Property]++
			continue
		}
		logger.Debug("Info", "skip metering", "category", monitor.Category, "property", monitor.Property, "lastUpdateTime", updateTimeMap[monitor.Category][monitor.Property].UTC(), "startTime", startTime)
	}

	if err := cursor.Err(); err != nil {
		return fmt.Errorf("cursor error: %v", err)
	}
	eg, _ := errgroup.WithContext(context.Background())

	for category, propertyMap := range meteringMap {
		for property, totalValue := range propertyMap {
			count := countMap[category][property]
			if count < 60 {
				count = 60
			}
			unitValue := math.Ceil(float64(totalValue) / float64(count))
			metering := &controllers.Metering{
				Category: category,
				Property: property,
				Time:     endTime,
				Amount:   int64(unitValue * prices[property].Price),
				Value:    int64(unitValue),
				Status:   0,
				Detail:   "",
			}
			_category, _property := category, property
			eg.Go(func() error {
				_, err := meteringCollection.InsertOne(context.Background(), metering)
				if err != nil {
					//TODO if insert failed, should todo?
					logger.Error(err, "insert metering data failed", "category", _category, "property", _property)
				}
				return err
			})
		}
	}
	return eg.Wait()
}

func getUpdateTimeForCategoryAndPropertyFromMetering(mongoClient *mongo.Client, category string, property string) (time.Time, error) {
	filter := bson.M{"category": category, "property": property}
	// sort by time desc
	opts := options.FindOne().SetSort(bson.M{"time": -1})

	var result struct {
		Time time.Time `bson:"time"`
	}
	err := mongoClient.Database(controllers.SealosResourcesDBName).Collection(controllers.SealosMeteringCollectionName).FindOne(context.Background(), filter, opts).Decode(&result)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			// No documents match the filter. Handle this case accordingly.
			return time.Time{}, nil
		}
		return time.Time{}, err
	}

	return result.Time, nil
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
		MongoConnectURL: os.Getenv(controllers.MongoURL),
		MongoUsername:   os.Getenv(controllers.MongoUsername),
		MongoPassword:   os.Getenv(controllers.MongoPassword),
	}
}
