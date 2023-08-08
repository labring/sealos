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
	"strconv"
	"sync"
	"time"

	ntf "github.com/labring/sealos/controllers/pkg/notification"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
)

const dateFormat = "2006-01-02"
const Memory = "memory"

type TypeInfo string
type Date string

const (
	ResourceOnCluster TypeInfo = "ClusterResource"
	DailyUsage        TypeInfo = "DailyUsage"
)

type CollectorInfo struct {
	UID             string            `json:"uid"`
	InfoType        TypeInfo          `json:"infoType"`
	DailyUsage      DailyClusterUsage `json:"dailyUsage,omitempty"`
	ClusterResource ClusterResource   `json:"clusterResource,omitempty"`
}

type DailyClusterUsage struct {
	Date          Date      `json:"date"`
	TotalUsageFee float64   `json:"totalUsageFee"`
	HourlyUsage   []float64 `json:"hourlyUsage"`
}

type TotalNodesResource struct {
	mutex           sync.Mutex
	TotalPVCapacity resource.Quantity
	TotalMemory     resource.Quantity
	TotalCPU        resource.Quantity
}

type ClusterResource struct {
	Nodes  string `json:"nodes"`
	CPU    string `json:"cpu"`
	Memory string `json:"memery"`
	Disk   string `json:"disk"`
}

type collect struct {
	// uid
	uid string
	// resource collect time of last
	lastTimeForResource int64
	// usgae collect time of last
	lastTimeForUsage int64

	ClusterResource   ClusterResource
	DailyClusterUsage DailyClusterUsage

	options Options
}

func (c *collect) collectWork(instance *TaskInstance) error {
	uid, urlMap, err := GetUIDURL(instance.ctx, instance.Client)
	if err != nil {
		instance.logger.Error(err, "failed to get uid and url")
		return err
	}
	c.uid = uid

	if time.Unix(c.lastTimeForResource, 0).Add(time.Hour * 24).Before(time.Now()) {
		err := c.collectResource(instance)
		if err != nil {
			return err
		}
		err = Push(urlMap[CollectorURL], c.ClusterResource)
		if err != nil {
			instance.logger.Error(err, "failed to push cluster resource")
			return err
		}
	}
	if time.Unix(c.lastTimeForUsage, 0).Add(time.Hour * 24).Before(time.Now()) {
		err := c.collectUsage(instance)
		if err != nil {
			return err
		}
		err = Push(urlMap[CollectorURL], c.DailyClusterUsage)
		if err != nil {
			instance.logger.Error(err, "failed to push cluster usage")
			return err
		}
	}
	return nil
}

func (c *collect) collectResource(instance *TaskInstance) error {
	// MongoURI := c.options.GetEnvOptions().MongoURI
	return nil
}

func (c *collect) collectUsage(instance *TaskInstance) error {
	pool := ntf.NewPool(maxBatchSize)
	pool.Run(maxChannelSize)
	nodeList := &corev1.NodeList{}
	err := instance.List(instance.ctx, nodeList)
	if err != nil {
		instance.logger.Error(err, "failed to list node")
		return err
	}
	tnr := TotalNodesResource{}
	for _, node := range nodeList.Items {
		node := node
		pool.Add(func() {
			tnr.getCPUMemoryResource(&node)
		})
	}
	pool.Wait()
	c.ClusterResource.CPU = tnr.TotalCPU.String()
	c.ClusterResource.Memory = tnr.TotalMemory.String()
	c.ClusterResource.Nodes = strconv.Itoa(len(nodeList.Items))
	return nil
}

// TotalNodesResource is used to collect the total resource of the cluster.
func (tnr *TotalNodesResource) getCPUMemoryResource(node *corev1.Node) {
	var nodeMemory resource.Quantity
	var nodeCPU resource.Quantity

	nodeMemory.Add(node.Status.Capacity[Memory])
	nodeCPU.Add(*node.Status.Capacity.Cpu())

	tnr.mutex.Lock()

	defer tnr.mutex.Unlock()
	tnr.TotalMemory.Add(nodeMemory)
	tnr.TotalCPU.Add(nodeCPU)
}
