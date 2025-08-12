package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/joho/godotenv/autoload"
	"github.com/labring/sealos/service/devbox/api"
	"github.com/labring/sealos/service/devbox/middleware"
	tag "github.com/labring/sealos/service/devbox/pkg/registry"
)

func main() {
	user := os.Getenv("USER")
	password := os.Getenv("PASSWORD")
	tag.New(user, password)
	if os.Getenv("GIN_MODE") != gin.DebugMode {
		gin.SetMode(gin.ReleaseMode)
	}
	slog.SetLogLoggerLevel(slog.LevelInfo)
	if os.Getenv("LOG_LEVEL") != "debug" {
		slog.SetLogLoggerLevel(slog.LevelDebug)
	}

	r := gin.Default()
	r.Use(gin.Recovery())
	r.Use(middleware.CORS())
	r.POST("/tag", middleware.TokenAuth, api.Tag)

	r.GET("/health", func(ctx *gin.Context) {
		ctx.Status(http.StatusOK)
	})

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	server := http.Server{
		Addr:              ":8092",
		Handler:           r.Handler(),
		ReadHeaderTimeout: time.Second * 5,
	}
	go func() {
		if err := server.ListenAndServe(); err != nil &&
			!errors.Is(err, http.ErrServerClosed) {
			slog.Error("failed to start HTTP server: " + err.Error())
		}
	}()

	<-ctx.Done()

	shutdownSrvCtx, shutdownSrvCancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer shutdownSrvCancel()

	if err := server.Shutdown(shutdownSrvCtx); err != nil {
		slog.Error("server forced to shutdown: " + err.Error())
		return
	}
	slog.Info("server shutdown successfully")
}
