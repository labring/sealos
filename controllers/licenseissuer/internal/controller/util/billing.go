/*
Copyright 2023.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package util

import (
	"context"
	"strconv"
	"time"

	"github.com/labring/sealos/controllers/pkg/common"
	"github.com/labring/sealos/controllers/pkg/crypto"
	"go.mongodb.org/mongo-driver/bson"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// used to bill the cluster usage by the cluster scale

const defaultCryptoKey = "0123456789ABCDEF0123456789ABCDEF"

var CryptoKey = defaultCryptoKey

type ClusterScaleBilling struct {
	tnr TotalNodesResource
}

type billing struct {
	ClusterID  string `json:"clusterID" bson:"clusterID"`
	CreateTime string `json:"createTime" bson:"createTime"`
	TotalFee   int64  `json:"totalFee" bson:"totalFee"`
}

type Prices struct {
	Property string `json:"property" bson:"property"`
	Price    string `json:"price" bson:"price"`
	Detail   string `json:"detail" bson:"detail"`
}

func NewClusterScaleBillingWork() *ClusterScaleBilling {
	return &ClusterScaleBilling{
		tnr: TotalNodesResource{},
	}
}

func (c *ClusterScaleBilling) billingWork(ti *TaskInstance) error {
	var err error
	// get the cluster resource
	err = c.GetClusterResource(ti.ctx, ti.Client)
	if err != nil {
		return err
	}
	// get the cluster billing info
	Prices := c.GetPrices()
	// calculate the billing info
	var fee int64
	for _, v := range Prices {
		switch v.Property {
		case "node":
			nums, _ := strconv.Atoi(c.tnr.TotalNodes)
			fee += int64(nums) * v.Price
		case "cpu":
			fee += c.tnr.TotalCPU.Value() * v.Price
			// case "gpu":
			// 	fee += c.tnr.TotalGPU.Value() * v.Price
			// case "memory":
			// 	fee += c.tnr.TotalMemory.Value() * v.Price
		}
	}

	c.tnr = TotalNodesResource{}

	// save the billing info
	uid, _ := GetUID(ti.ctx, ti.Client)

	// save the billing info
	mongoDB := NewMongoDB("cluster", "scale_billing")
	doc := bson.M{
		"clusterID":  uid,
		"createTime": time.Now().Format("2006-01-02"),
		"totalFee":   fee,
	}

	// IF record error, will record later
	err = mongoDB.InsertIfNotExisted(doc, bson.M{"createTime": doc["createTime"]})
	if err != nil {
		ti.logger.Info("failed to save the billing info", "err", err)
		return err
	}
	// IF record success, will update the usage
	// else will update the usage later
	return AccumulateUsage(ti.ctx, ti.Client, fee)
}

func (c *ClusterScaleBilling) GetPrices() map[string]common.Price {
	var priceMap map[string]common.Price
	mongoDB := NewMongoDB("cluster", "prices")
	doc, err := mongoDB.FindDocs(bson.M{})
	if err != nil || doc == nil {
		return common.DefaultPrices
	}
	for _, v := range doc {
		var price Prices
		bsonBytes, _ := bson.Marshal(v)
		err = bson.Unmarshal(bsonBytes, &price)
		if err != nil {
			// handle error
			return common.DefaultPrices
		}
		var priceInt64 int64
		priceInt64, err := crypto.DecryptInt64WithKey(price.Price, []byte(CryptoKey))
		if err != nil {
			priceInt64 = common.DefaultPrices[price.Property].Price
		}
		priceMap[price.Property] = common.Price{
			Property: price.Property,
			Price:    priceInt64,
			Detail:   price.Detail,
		}
	}
	return priceMap
}

func (c *ClusterScaleBilling) GetClusterResource(ctx context.Context, client client.Client) error {
	err := GetNodeResource(ctx, client, &c.tnr)
	if err != nil {
		return err
	}
	err = GetPVResource(ctx, client, &c.tnr)
	if err != nil {
		return err
	}
	return nil
}
