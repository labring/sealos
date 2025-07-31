package main

import (
	"context"
	"flag"

	"github.com/labring/sealos/service/hubble/collector"
	"github.com/labring/sealos/service/hubble/config"
	"github.com/labring/sealos/service/hubble/datastore"
	"github.com/labring/sealos/service/hubble/server"

	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-redis/redis/v8"
)

func main() {
	configPath := flag.String("config", "", "path to configuration file")
	flag.Parse()

	cfg, err := config.LoadConfig(*configPath)
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize Redis client with configuration settings
	redisClient := redis.NewClient(&redis.Options{
		Addr:     cfg.Redis.Addr,
		Username: cfg.Redis.Username,
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	})
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := redisClient.Ping(ctx).Err(); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	log.Println("Successfully connected to Redis")
	dataStore := datastore.NewDataStore(redisClient)

	// Create a cancellable context for application lifecycle management
	ctx, cancel = context.WithCancel(context.Background())

	// Initialize and start the collector in a separate goroutine
	collector := collector.NewCollector(cfg.Hubble.Addr, dataStore)
	go collector.Start(ctx)

	// Initialize HTTP server with routes and authentication
	server := server.NewServer(dataStore, cfg.Auth.WhiteList)
	httpServer := &http.Server{
		Addr:    cfg.HTTP.Addr,
		Handler: server.Router,
	}
	go func() {
		log.Printf("Starting HTTP server on %s", cfg.HTTP.Addr)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("HTTP server error: %v", err)
		}
	}()

	// Set up signal handling for graceful shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	// Create a timeout context for graceful shutdown
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	cancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("HTTP server shutdown error: %v", err)
	} else {
		log.Println("HTTP server shutdown gracefully")
	}

	select {
	case <-time.After(5 * time.Second):
		log.Println("Waited for collector to shutdown")
	case <-shutdownCtx.Done():
		log.Println("Shutdown timeout reached")
	}
	log.Println("Graceful shutdown completed")
}
