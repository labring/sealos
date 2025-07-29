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
	server := server.NewServer(dataStore, cfg.Auth.WhiteList)
	collector := collector.NewCollector(cfg.Hubble.Addr, dataStore)

	go collector.Start()

	go func() {
		log.Printf("Starting HTTP server on %s", cfg.HTTP.Addr)
		if err := http.ListenAndServe(cfg.HTTP.Addr, server.Router); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	log.Println("Shutting down...")
	collector.Stop()
}
