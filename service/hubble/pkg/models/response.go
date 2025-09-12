package models

type TrafficResponse struct {
	Message string `json:"message"`
	Data    any    `json:"data"`
}

type TrafficData struct {
	Resource Resource `json:"resource"`
	Flows    []string `json:"flows"`
}
