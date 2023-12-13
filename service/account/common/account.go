package common

type PropertyQuery struct {
	Name      string  `json:"name,omitempty" bson:"name,omitempty" example:"cpu"`
	Alias     string  `json:"alias,omitempty" bson:"alias,omitempty" example:"gpu-tesla-v100"`
	UnitPrice float64 `json:"unit_price,omitempty" bson:"unit_price,omitempty" example:"10000"`
	Unit      string  `json:"unit,omitempty" bson:"unit,omitempty" example:"1m"`
}

type TimeCostsMap [][]interface{}
