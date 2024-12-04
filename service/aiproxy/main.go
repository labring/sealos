package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"sync"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/joho/godotenv/autoload"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/balance"
	"github.com/labring/sealos/service/aiproxy/common/client"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
	relaycontroller "github.com/labring/sealos/service/aiproxy/relay/controller"
	"github.com/labring/sealos/service/aiproxy/router"
)

func initializeServices() error {
	common.Init()
	logger.SetupLogger()

	if err := initializeBalance(); err != nil {
		return err
	}

	setupGinMode()

	if err := initializeDatabases(); err != nil {
		return err
	}

	if err := initializeCaches(); err != nil {
		return err
	}

	client.Init()
	return nil
}

func initializeBalance() error {
	sealosJwtKey := os.Getenv("SEALOS_JWT_KEY")
	if sealosJwtKey == "" {
		logger.SysLog("SEALOS_JWT_KEY is not set, balance will not be enabled")
		return nil
	}

	logger.SysLog("SEALOS_JWT_KEY is set, balance will be enabled")
	return balance.InitSealos(sealosJwtKey, os.Getenv("SEALOS_ACCOUNT_URL"))
}

func setupGinMode() {
	if os.Getenv("GIN_MODE") != gin.DebugMode {
		gin.SetMode(gin.ReleaseMode)
	}
	if config.DebugEnabled {
		logger.SysLog("running in debug mode")
	}
}

func initializeDatabases() error {
	model.InitDB()
	model.InitLogDB()
	return common.InitRedisClient()
}

func initializeCaches() error {
	if err := model.InitOptionMap(); err != nil {
		return err
	}
	if err := model.InitModelConfigCache(); err != nil {
		return err
	}
	return model.InitChannelCache()
}

func startSyncServices(ctx context.Context, wg *sync.WaitGroup) {
	wg.Add(3)
	go model.SyncOptions(ctx, wg, time.Second*5)
	go model.SyncChannelCache(ctx, wg, time.Second*5)
	go model.SyncModelConfigCache(ctx, wg, time.Second*5)

	if config.EnableMetric {
		logger.SysLog("metric enabled, will disable channel if too much request failed")
	}
}

func setupHTTPServer() (*http.Server, *gin.Engine) {
	server := gin.New()
	server.Use(gin.Recovery())
	server.Use(middleware.RequestID)
	middleware.SetUpLogger(server)
	router.SetRouter(server)

	port := os.Getenv("PORT")
	if port == "" {
		port = strconv.Itoa(*common.Port)
	}

	return &http.Server{
		Addr:              ":" + port,
		ReadHeaderTimeout: 10 * time.Second,
		Handler:           server,
	}, server
}

func main() {
	if err := initializeServices(); err != nil {
		logger.FatalLog("failed to initialize services: " + err.Error())
	}

	defer func() {
		if err := model.CloseDB(); err != nil {
			logger.FatalLog("failed to close database: " + err.Error())
		}
	}()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	var wg sync.WaitGroup
	startSyncServices(ctx, &wg)

	srv, _ := setupHTTPServer()

	go func() {
		logger.SysLogf("server started on http://localhost:%s", srv.Addr[1:])
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.FatalLog("failed to start HTTP server: " + err.Error())
		}
	}()

	<-ctx.Done()
	logger.SysLog("shutting down server...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.SysError("server forced to shutdown: " + err.Error())
	}

	relaycontroller.ConsumeWaitGroup.Wait()
	wg.Wait()

	logger.SysLog("server exiting")
}
