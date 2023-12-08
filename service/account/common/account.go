package common

type PropertyQuery struct {
	Name      string  `json:"name" bson:"name"`
	Alias     string  `json:"alias" bson:"alias"`
	UnitPrice float64 `json:"unit_price" bson:"unit_price"`
	Unit      string  `json:"unit" bson:"unit"`
}

type TimeCostsMap [][]interface{}
