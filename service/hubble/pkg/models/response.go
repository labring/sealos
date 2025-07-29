package models

type Response struct {
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

type DiscoveryData struct {
	PodName string `json:"podName"`
	Flows   []Flow `json:"flows"`
}
