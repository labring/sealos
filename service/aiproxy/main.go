package main

import (
	"context"
	"fmt"
	stdlog "log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"strconv"
	"sync"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/joho/godotenv/autoload"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/balance"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/consume"
	"github.com/labring/sealos/service/aiproxy/controller"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/router"
	log "github.com/sirupsen/logrus"
)

func initializeServices() error {
	setLog(log.StandardLogger())

	common.Init()

	if err := initializeBalance(); err != nil {
		return err
	}

	if err := initializeDatabases(); err != nil {
		return err
	}

	return initializeCaches()
}

func initializeBalance() error {
	sealosJwtKey := os.Getenv("SEALOS_JWT_KEY")
	if sealosJwtKey == "" {
		log.Info("SEALOS_JWT_KEY is not set, balance will not be enabled")
		return nil
	}

	log.Info("SEALOS_JWT_KEY is set, balance will be enabled")
	return balance.InitSealos(sealosJwtKey, os.Getenv("SEALOS_ACCOUNT_URL"))
}

var logCallerIgnoreFuncs = map[string]struct{}{
	"github.com/labring/sealos/service/aiproxy/middleware.logColor": {},
}

func setLog(l *log.Logger) {
	gin.ForceConsoleColor()
	if config.DebugEnabled {
		l.SetLevel(log.DebugLevel)
		l.SetReportCaller(true)
		gin.SetMode(gin.DebugMode)
	} else {
		l.SetLevel(log.InfoLevel)
		l.SetReportCaller(false)
		gin.SetMode(gin.ReleaseMode)
	}
	l.SetOutput(os.Stdout)
	stdlog.SetOutput(l.Writer())

	l.SetFormatter(&log.TextFormatter{
		ForceColors:      true,
		DisableColors:    false,
		ForceQuote:       config.DebugEnabled,
		DisableQuote:     !config.DebugEnabled,
		DisableSorting:   false,
		FullTimestamp:    true,
		TimestampFormat:  time.DateTime,
		QuoteEmptyFields: true,
		CallerPrettyfier: func(f *runtime.Frame) (function string, file string) {
			if _, ok := logCallerIgnoreFuncs[f.Function]; ok {
				return "", ""
			}
			return f.Function, fmt.Sprintf("%s:%d", f.File, f.Line)
		},
	})

	if common.NeedColor() {
		gin.ForceConsoleColor()
	}
}

func initializeDatabases() error {
	model.InitDB()
	model.InitLogDB()
	return common.InitRedisClient()
}

func initializeCaches() error {
	if err := model.InitOption2DB(); err != nil {
		return err
	}
	return model.InitModelConfigAndChannelCache()
}

func startSyncServices(ctx context.Context, wg *sync.WaitGroup) {
	wg.Add(2)
	go model.SyncOptions(ctx, wg, time.Second*5)
	go model.SyncModelConfigAndChannelCache(ctx, wg, time.Second*10)
}

func setupHTTPServer() (*http.Server, *gin.Engine) {
	server := gin.New()

	w := log.StandardLogger().Writer()
	server.
		Use(gin.RecoveryWithWriter(w)).
		Use(middleware.NewLog(log.StandardLogger())).
		Use(middleware.RequestID, middleware.CORS())
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

func autoTestBannedModels() {
	log.Info("auto test banned models start")
	ticker := time.NewTicker(time.Second * 15)
	defer ticker.Stop()

	for range ticker.C {
		controller.AutoTestBannedModels()
	}
}

func main() {
	if err := initializeServices(); err != nil {
		log.Fatal("failed to initialize services: " + err.Error())
	}

	defer func() {
		if err := model.CloseDB(); err != nil {
			log.Fatal("failed to close database: " + err.Error())
		}
	}()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	var wg sync.WaitGroup
	startSyncServices(ctx, &wg)

	srv, _ := setupHTTPServer()

	go func() {
		log.Infof("server started on http://localhost:%s", srv.Addr[1:])
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("failed to start HTTP server: " + err.Error())
		}
	}()

	go autoTestBannedModels()

	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 600*time.Second)
	defer cancel()

	log.Info("shutting down http server...")
	log.Info("max wait time: 600s")
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error("server forced to shutdown: " + err.Error())
	} else {
		log.Info("server shutdown successfully")
	}

	log.Info("shutting down consumer...")
	consume.Wait()

	log.Info("shutting down sync services...")
	wg.Wait()

	log.Info("server exiting")
}
