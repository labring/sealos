package models

type TrafficRequest struct {
	Resources []Resource `json:"resources" binding:"required"`
}

type Resource struct {
	Name string `json:"name" binding:"required"`
	Type string `json:"type" binding:"required"`
}
