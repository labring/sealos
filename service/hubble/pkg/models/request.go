package models

type DiscoveryRequest struct {
	PodNames []string `json:"podNames" binding:"required"`
}
