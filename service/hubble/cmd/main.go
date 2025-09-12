package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/labring/sealos/service/hubble/collector"
	"github.com/labring/sealos/service/hubble/config"
	"github.com/labring/sealos/service/hubble/datastore"
	"github.com/labring/sealos/service/hubble/server"
)

func main() {
	configPath := flag.String("config", "", "path to configuration file")
	flag.Parse()

	cfg, err := config.LoadConfig(*configPath)
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}
	redisClient := redis.NewClient(&redis.Options{
		Addr:     cfg.Redis.Addr,
		Username: cfg.Redis.Username,
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	})
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := redisClient.Ping(ctx).Err(); err != nil {
		cancel()
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	log.Println("Successfully connected to Redis")
	dataStore := datastore.NewDataStore(redisClient)
	ctx, cancel = context.WithCancel(context.Background())
	collector, err := collector.NewCollector(cfg.Hubble.Addr, dataStore, true)
	if err != nil {
		cancel()
		log.Fatalf("Failed to create collector: %v", err)
	}
	go collector.Start(ctx)
	server := server.NewServer(dataStore, cfg.Auth.WhiteList)
	httpServer := &http.Server{
		ReadHeaderTimeout: 5 * time.Second,
		Addr:              cfg.HTTP.Port,
		Handler:           server.Router,
	}
	go func() {
		log.Printf("Starting HTTP server on %s", cfg.HTTP.Port)
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
	log.Println("Graceful shutdown completed")
}
