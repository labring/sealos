package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/joho/godotenv/autoload"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/balance"
	"github.com/labring/sealos/service/aiproxy/common/client"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"github.com/labring/sealos/service/aiproxy/controller"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
	relaycontroller "github.com/labring/sealos/service/aiproxy/relay/controller"
	"github.com/labring/sealos/service/aiproxy/router"
)

func main() {
	common.Init()
	logger.SetupLogger()

	sealosJwtKey := os.Getenv("SEALOS_JWT_KEY")
	if sealosJwtKey == "" {
		logger.SysLog("SEALOS_JWT_KEY is not set, balance will not be enabled")
	} else {
		logger.SysLog("SEALOS_JWT_KEY is set, balance will be enabled")
		err := balance.InitSealos(sealosJwtKey, os.Getenv("SEALOS_ACCOUNT_URL"))
		if err != nil {
			logger.FatalLog("failed to initialize sealos balance: " + err.Error())
		}
	}

	if os.Getenv("GIN_MODE") != gin.DebugMode {
		gin.SetMode(gin.ReleaseMode)
	}
	if config.DebugEnabled {
		logger.SysLog("running in debug mode")
	}

	// Initialize SQL Database
	model.InitDB()
	model.InitLogDB()

	defer func() {
		err := model.CloseDB()
		if err != nil {
			logger.FatalLog("failed to close database: " + err.Error())
		}
	}()

	// Initialize Redis
	err := common.InitRedisClient()
	if err != nil {
		logger.FatalLog("failed to initialize Redis: " + err.Error())
	}

	err = model.InitModelConfigCache()
	if err != nil {
		logger.FatalLog("failed to initialize model config cache: " + err.Error())
	}
	err = model.InitChannelCache()
	if err != nil {
		logger.FatalLog("failed to initialize channel cache: " + err.Error())
	}
	err = model.InitOptionMap()
	if err != nil {
		logger.FatalLog("failed to initialize option map: " + err.Error())
	}
	go model.SyncOptions(time.Second * 5)
	go model.SyncChannelCache(time.Second * 5)
	go model.SyncModelConfigCache(time.Second * 5)
	if os.Getenv("CHANNEL_TEST_FREQUENCY") != "" {
		frequency, err := strconv.Atoi(os.Getenv("CHANNEL_TEST_FREQUENCY"))
		if err != nil {
			logger.FatalLog("failed to parse CHANNEL_TEST_FREQUENCY: " + err.Error())
		}
		go controller.AutomaticallyTestChannels(frequency)
	}
	if config.EnableMetric {
		logger.SysLog("metric enabled, will disable channel if too much request failed")
	}
	client.Init()

	// Initialize HTTP server
	server := gin.New()
	server.Use(gin.Recovery())
	server.Use(middleware.RequestID)
	middleware.SetUpLogger(server)

	router.SetRouter(server)
	port := os.Getenv("PORT")
	if port == "" {
		port = strconv.Itoa(*common.Port)
	}

	// Create HTTP server
	srv := &http.Server{
		Addr:              ":" + port,
		ReadHeaderTimeout: 10 * time.Second,
		Handler:           server,
	}

	// Graceful shutdown setup
	go func() {
		logger.SysLogf("server started on http://localhost:%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.FatalLog("failed to start HTTP server: " + err.Error())
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit
	logger.SysLog("shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.SysError("server forced to shutdown: " + err.Error())
	}

	relaycontroller.ConsumeWaitGroup.Wait()

	logger.SysLog("server exiting")
}
