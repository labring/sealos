package resource

import (
	"k8s.io/apimachinery/pkg/api/resource"
)

type RequestRate struct {
	CPU    float64
	Memory float64
}

type EphemeralStorage struct {
	DefaultRequest resource.Quantity
	DefaultLimit   resource.Quantity
	MaximumLimit   resource.Quantity
}
