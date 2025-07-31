package models

type TrafficRequest struct {
	Resources []string `json:"resources" binding:"required"`
}
