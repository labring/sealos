package models

type FlowsRequest struct {
	CRNames []string `json:"crNames" binding:"required"`
}
