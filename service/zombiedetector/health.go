package main

import (
	"log"
	"net/http"
	"time"
)

func startHealthServer() {
	mux := http.NewServeMux()

	// Liveness probe
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// Readiness probe
	mux.HandleFunc("/readyz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	server := &http.Server{
		Addr:              ":8080",
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Println("Starting health check server on :8080")

	if err := server.ListenAndServe(); err != nil {
		log.Printf("Health check server error: %v", err)
	}
}
