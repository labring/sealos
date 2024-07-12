package common

import "time"

type PropertyQuery struct {
	Name      string  `json:"name,omitempty" bson:"name,omitempty" example:"cpu"`
	Alias     string  `json:"alias,omitempty" bson:"alias,omitempty" example:"gpu-tesla-v100"`
	UnitPrice float64 `json:"unit_price,omitempty" bson:"unit_price,omitempty" example:"10000"`
	Unit      string  `json:"unit,omitempty" bson:"unit,omitempty" example:"1m"`
}

type TimeCostsMap [][]interface{}

type AppCosts struct {
	Costs        []AppCost `json:"costs,omitempty" bson:"costs,omitempty"`
	CurrentPage  int       `json:"current_page,omitempty" bson:"current_page,omitempty" example:"1"`
	TotalPages   int       `json:"total_pages,omitempty" bson:"total_pages,omitempty" example:"1"`
	TotalRecords int       `json:"total_records,omitempty" bson:"total_records,omitempty" example:"1"`
}

type AppCost struct {
	AppName   string    `json:"app_name,omitempty" bson:"app_name,omitempty" example:"app"`
	AppType   int32     `json:"app_type,omitempty" bson:"app_type,omitempty" example:"app"`
	Time      time.Time `json:"time,omitempty" bson:"time,omitempty" example:"2021-01-01T00:00:00Z"`
	OrderID   string    `json:"order_id,omitempty" bson:"order_id,omitempty" example:"order_id"`
	Namespace string    `json:"namespace,omitempty" bson:"namespace,omitempty" example:"ns-admin"`
	Used      Used      `json:"used,omitempty" bson:"used,omitempty"`
	Amount    int64     `json:"amount,omitempty" bson:"amount,omitempty" example:"100000000"`
}

type Used map[uint8]int64
