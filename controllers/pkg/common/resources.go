// Copyright © 2023 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package common

import (
	"context"
	"fmt"
	"math"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/labring/sealos/controllers/pkg/common/gpu"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"

	corev1 "k8s.io/api/core/v1"

	"k8s.io/apimachinery/pkg/api/resource"
)

const (
	CategoryField = "category"
	PropertyField = "property"
	TimeField     = "time"
	ValueField    = "value"
	PriceField    = "price"
	AmountField   = "amount"
)

/*
Unified base unit:

CPU: millicore (mCore) (1 core = 1000 millicores) 0.067 / 1000 * 1000000 = 67 unit price
Memory: Mebibytes (MiB) 0.033 / 1024 (2^30) * 1000000 = 33 unit price
Storage: Mebibytes (MiB) 0.0021 / 1024 * 1000000 = 2 unit price
Network bandwidth: Kbps (kilobits per second) not yet available
*/

//| property     | Price | Detail         |
//| ------------ | ----- | -------------- |
//| Cpu          | 67    | mCore unit     |
//| Memory       | 33    | Mebibytes unit |
//| Disk         | 2     | Mebibytes unit |
//| Mongodb      | 1     | feature...     |
//| Minio        | 1     | Mebibytes unit |
//| Infra-Cpu    | 67    | mCore unit     |
//| Infra-Memory | 33    | Mebibytes unit |
//| Infra-Disk   | 2     | Mebibytes unit |
//
// price: 1000000 = 1¥

type Price struct {
	Property string `json:"property" bson:"property"`
	Price    int64  `json:"price" bson:"price"`
	Detail   string `json:"detail" bson:"detail"`
	//Unit     string  `json:"unit" bson:"unit"`
}

//| Category   | property     | Time       | value |      |
//| ---------- | ------------ | -------    | ----- | ---- |
//| Namespace1 | cpu          | timestamp1 | 5     |      |
//| Namespace1 | memory       | timestamp1 | 100   |      |
//| Namespace1 | disk         | timestamp1 | 30    |      |
//| appid1     | mongodb      | timestamp1 | 100   |      |
//| appid1     | Minio        | timestamp1 | 100   |      |
//| Namespace2 | Infra-Cpu    | timestamp1 | 5     |      |
//| Namespace2 | cpu          | timestamp1 | 100   |      |
//| Namespace2 | Infra-Memory | timestamp1 | 30    |      |
//| Namespace2 | Infra-Disk   | timestamp1 | 100   |      |
//| Namespace2 | memory       | timestamp1 | 100   |      |
//| Namespace2 |  disk        | timestamp1 | 100   |      |

// Composite index: category, property, time, speed up query
type Monitor struct {
	Category string    `json:"category" bson:"category"`
	Property string    `json:"property" bson:"property"`
	Time     time.Time `json:"time" bson:"time"`
	Value    int64     `json:"value" bson:"value"`
	//Status   int       `json:"status" bson:"status"`
	Detail string `json:"detail" bson:"detail"`
}

//| Category   | Property | Time       | Value (average value) | Amount (value * price) | Detail | Status |
//| ---------- | -------- | ---------- | --------------------- | ---------------------- | ------ | ------ |
//| Namespace1 | Cpu      | 2023010112 | 1000                  | 67000                  |        | 0      |

type Metering struct {
	Category string `json:"category" bson:"category"`
	//time 2023010112 -> 2023-01-01 11:00:00 - 2023-01-01 12:00:00
	Amount int64 `json:"amount" bson:"amount"`
	// 2023010112 -> 2023-01-01 12:00:00
	Property string    `json:"property" bson:"property"`
	Value    int64     `json:"value" bson:"value"`
	Time     time.Time `json:"time" bson:"time"`
	Detail   string    `json:"detail" bson:"detail"`
	// 0 -> not settled, 1 -> settled, -1 -> deleted, -2 -> refunded
	//Status int `json:"status" bson:"status"`
}

type QuantityDetail struct {
	*resource.Quantity
	Detail string
}

const (
	SealosResourcesDBName        = "sealos-resources"
	SealosMonitorCollectionName  = "monitor"
	SealosPricesCollectionName   = "prices"
	SealosMeteringCollectionName = "metering"
	SealosBillingCollectionName  = "billing"
)

const (
	PropertyInfraCPU    = "infra-cpu"
	PropertyInfraMemory = "infra-memory"
	PropertyInfraDisk   = "infra-disk"
)

const ResourceGPU corev1.ResourceName = gpu.NvidiaGpuKey

func NewGpuResource(product string) corev1.ResourceName {
	return corev1.ResourceName("gpu-" + product)
}

var (
	bin1Mi  = resource.NewQuantity(1<<20, resource.BinarySI)
	cpuUnit = resource.MustParse("1m")
)

var PricesUnit = map[corev1.ResourceName]*resource.Quantity{
	corev1.ResourceCPU:     &cpuUnit, // 1 m CPU (1000 μ)
	ResourceGPU:            &cpuUnit, // 1 m CPU (1000 μ)
	corev1.ResourceMemory:  bin1Mi,   // 1 MiB
	corev1.ResourceStorage: bin1Mi,   // 1 MiB
}

var DefaultPrices = map[string]Price{
	"cpu": {
		Property: "cpu",
		Price:    67,
	},
	"memory": {
		Property: "memory",
		Price:    33,
	},
	"storage": {
		Property: "storage",
		Price:    2,
	},
}

// Core
var infraCPUMap = map[string]int{
	"t2.medium":     2,
	"t2.large":      2,
	"t2.xlarge":     4,
	"ecs.c7.large":  2,
	"ecs.g7.large":  2,
	"ecs.g7.xlarge": 4,
}

// GiB
var infraMemoryMap = map[string]int{
	"t2.medium":     4,
	"t2.large":      8,
	"t2.xlarge":     16,
	"ecs.c7.large":  4,
	"ecs.g7.large":  8,
	"ecs.g7.xlarge": 16,
}

func GetDefaultResourceQuota(ns, name string) *corev1.ResourceQuota {
	return &corev1.ResourceQuota{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: ns,
		},
		Spec: corev1.ResourceQuotaSpec{
			Hard: DefaultResourceQuotaHard(),
		},
	}
}

func GetDefaultLimitRange(ns, name string) *corev1.LimitRange {
	return &corev1.LimitRange{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: ns,
		},
		Spec: corev1.LimitRangeSpec{
			Limits: DefaultLimitRangeLimits(),
		},
	}
}

func DefaultResourceQuotaHard() corev1.ResourceList {
	return corev1.ResourceList{
		//corev1.ResourceRequestsCPU:    resource.MustParse("100"),
		corev1.ResourceLimitsCPU: resource.MustParse("16"),
		//corev1.ResourceRequestsMemory: resource.MustParse("100"),
		corev1.ResourceLimitsMemory: resource.MustParse("64Gi"),
		//For all PVCs, the total demand for storage resources cannot exceed this value
		corev1.ResourceRequestsStorage: resource.MustParse("100Gi"),
		//"limit.storage": resource.MustParse("100Gi"),
		//Local ephemeral storage
		corev1.ResourceLimitsEphemeralStorage: resource.MustParse("100Gi"),
		//corev1.ResourceRequestsEphemeralStorage: resource.MustParse("100Gi"),
	}
}

func DefaultLimitRangeLimits() []corev1.LimitRangeItem {
	return []corev1.LimitRangeItem{
		{
			Type: corev1.LimitTypeContainer,
			Default: corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("50m"),
				corev1.ResourceMemory: resource.MustParse("64Mi"),
			},
		},
	}
}

// MiB
func GetInfraCPUQuantity(flavor string, count int) *resource.Quantity {
	if v, ok := infraCPUMap[flavor]; ok {
		return resource.NewQuantity(int64(v*count), resource.DecimalSI)
	}
	return nil
}

// Gib
func GetInfraMemoryQuantity(flavor string, count int) *resource.Quantity {
	if v, ok := infraMemoryMap[flavor]; ok {
		return resource.NewQuantity(int64((v*count)<<30), resource.BinarySI)
	}
	return nil
}

// Gib
func GetInfraDiskQuantity(capacity int) *resource.Quantity {
	return resource.NewQuantity(int64(capacity<<30), resource.BinarySI)
}

func GetResourceValue(resourceName corev1.ResourceName, res map[corev1.ResourceName]*QuantityDetail) int64 {
	quantity := res[resourceName]
	if quantity != nil && quantity.MilliValue() != 0 {
		return int64(math.Ceil(float64(quantity.MilliValue()) / float64(PricesUnit[resourceName].MilliValue())))
	}
	return 0
}

func GetPrices(mongoClient *mongo.Client) ([]Price, error) {
	collection := mongoClient.Database(SealosResourcesDBName).Collection(SealosPricesCollectionName)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	cursor, err := collection.Find(ctx, bson.M{})
	if err != nil {
		return nil, fmt.Errorf("get all prices error: %v", err)
	}
	var prices []Price
	if err = cursor.All(ctx, &prices); err != nil {
		return nil, fmt.Errorf("get all prices error: %v", err)
	}
	return prices, nil
}

// create unique index
//func createUniqueIndex(collection *mongo.Collection, field string) error {
//	indexModel := mongo.IndexModel{
//		Keys:    bson.D{{Key: field, Value: 1}},
//		Options: options.Index().SetUnique(true),
//	}
//
//	_, err := collection.Indexes().CreateOne(context.Background(), indexModel)
//	if err != nil {
//		return fmt.Errorf("failed to create unique index on %s: %v", field, err)
//	}
//	return nil
//}

//func createCompoundIndex(client *mongo.Client, dbName, collectionName string) error {
//	collection := client.Database(dbName).Collection(collectionName)
//	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
//	defer cancel()
//
//	indexModel := mongo.IndexModel{
//		Keys: bson.D{
//			{Key: CategoryField, Value: 1},
//			{Key: PropertyField, Value: 1},
//			{Key: TimeField, Value: 1},
//		},
//	}
//
//	_, err := collection.Indexes().CreateOne(ctx, indexModel)
//	return err
//}

//func ensureCompoundIndex(client *mongo.Client, dbName, collName string, indexKeys bson.M) error {
//	collection := client.Database(dbName).Collection(collName)
//	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
//	defer cancel()
//
//	// List all indexes in the collection
//	cursor, err := collection.Indexes().List(ctx)
//	if err != nil {
//		return err
//	}
//	defer cursor.Close(ctx)
//
//	// Check if the compound index already exists
//	indexExists := false
//	for cursor.Next(ctx) {
//		var index bson.M
//		if err := cursor.Decode(&index); err != nil {
//			return err
//		}
//		if keys, ok := index["key"].(bson.M); ok {
//			if reflect.DeepEqual(keys, indexKeys) {
//				indexExists = true
//				break
//			}
//		}
//	}
//
//	// Create the compound index if it doesn't exist
//	if !indexExists {
//		_, err := collection.Indexes().CreateOne(ctx, mongo.IndexModel{
//			Keys: indexKeys,
//		})
//		if err != nil {
//			return err
//		}
//	}
//	return nil
//}
