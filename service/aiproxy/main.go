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
	"github.com/labring/sealos/service/aiproxy/common/client"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
	relaycontroller "github.com/labring/sealos/service/aiproxy/relay/controller"
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

	if err := initializeCaches(); err != nil {
		return err
	}

	client.Init()
	return nil
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

	log.SetFormatter(&log.TextFormatter{
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
}

func setupHTTPServer() (*http.Server, *gin.Engine) {
	server := gin.New()

	w := log.StandardLogger().Writer()
	server.
		Use(middleware.NewLog(log.StandardLogger())).
		Use(gin.RecoveryWithWriter(w)).
		Use(middleware.RequestID)
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

	<-ctx.Done()
	log.Info("shutting down server...")
	log.Info("max wait time: 120s")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error("server forced to shutdown: " + err.Error())
	}

	relaycontroller.ConsumeWaitGroup.Wait()
	wg.Wait()

	log.Info("server exiting")
}
