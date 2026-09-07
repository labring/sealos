package server

import (
	"encoding/json"
	"log"
	"net/http"
)

const HealthPath = "/health"

type healthResponse struct {
	Status string `json:"status"`
}

func ServeHealth(rw http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		rw.Header().Set("Allow", http.MethodGet)
		http.Error(rw, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(rw).Encode(healthResponse{Status: "healthy"}); err != nil {
		log.Printf("Failed to write health response: %s", err)
	}
}
