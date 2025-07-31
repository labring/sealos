package models

type Response struct {
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

type FlowsData struct {
	CRName string   `json:"crName"`
	Flows  []string `json:"flows"`
}
