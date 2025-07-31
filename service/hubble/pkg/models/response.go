package models

type TrafficResponse struct {
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

type TrafficData struct {
	Resource string   `json:"resource"`
	Flows    []string `json:"flows"`
}
