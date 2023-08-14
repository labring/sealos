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

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	account "github.com/labring/sealos/controllers/common/account"
	"github.com/labring/sealos/controllers/pkg/database"
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
	TotalNodes      string
	TotalPVCapacity resource.Quantity
	TotalMemory     resource.Quantity
	TotalCPU        resource.Quantity
}

type ClusterResource struct {
	Nodes  string `json:"nodes"`
	CPU    string `json:"cpu"`
	GPU    string `json:"gpu"`
	Memory string `json:"memery"`
	Disk   string `json:"disk"`
}

type collect struct {
	url string
	// resource collect time of last
	lastTimeForResource int64
	// usgae collect time of last
	lastTimeForUsage int64

	ClusterResource   ClusterResource
	DailyClusterUsage DailyClusterUsage
	CollectorInfo     CollectorInfo

	options Options
}

func (c *collect) collectWork(instance *TaskInstance) error {
	uid, urlMap, err := GetUIDURL(instance.ctx, instance.Client)
	if err != nil {
		instance.logger.Error(err, "failed to get uid and url")
		return err
	}
	c.CollectorInfo.UID = uid
	c.url = urlMap[CollectorURL]
	if time.Unix(c.lastTimeForResource, 0).Add(time.Hour * 24).Before(time.Now()) {
		err := c.doResourceCollect(instance)
		if err != nil {
			return err
		}
	}
	if time.Unix(c.lastTimeForUsage, 0).Add(time.Hour * 24).Before(time.Now()) {
		err := c.doUsageCollect(instance)
		if err != nil {
			return err
		}
	}
	return nil
}

func (c *collect) collectResource(instance *TaskInstance) error {
	tnr := TotalNodesResource{}
	err := c.getNodeResource(instance, &tnr)
	if err != nil {
		instance.logger.Error(err, "failed to get node resource")
		return err
	}
	err = c.getPVResource(instance, &tnr)
	if err != nil {
		instance.logger.Error(err, "failed to get pv resource")
		return err
	}

	c.ClusterResource.CPU = tnr.TotalCPU.String()
	c.ClusterResource.Memory = tnr.TotalMemory.String()
	c.ClusterResource.Disk = tnr.TotalPVCapacity.String()
	c.ClusterResource.Nodes = tnr.TotalNodes
	return nil
}

func (c *collect) collectUsage(instance *TaskInstance) error {
	err := c.getUsageYesterday(instance)
	if err != nil {
		instance.logger.Info("failed to get usage yesterday")
		return err
	}
	return nil
}

// TotalNodesResource is used to collect the total resource of the cluster.
func (tnr *TotalNodesResource) getCPUMemoryResource(node *corev1.Node) {
	var nodeMemory resource.Quantity
	var nodeCPU resource.Quantity

	nodeMemory.Add(*node.Status.Capacity.Memory())
	nodeCPU.Add(*node.Status.Capacity.Cpu())

	tnr.mutex.Lock()

	defer tnr.mutex.Unlock()
	tnr.TotalMemory.Add(nodeMemory)
	tnr.TotalCPU.Add(nodeCPU)
}

func (c *collect) getUsageYesterday(instance *TaskInstance) error {
	MongoURI := c.options.GetEnvOptions().MongoURI
	dailyClusterUsage := DailyClusterUsage{}
	db, err := database.NewMongoDB(instance.ctx, MongoURI)
	if err != nil {
		instance.logger.Error(err, "failed to get mongo db")
		return err
	}
	start, end := GetYesterdayAndTodayMidnight()
	dailyClusterUsage.Date = Date(start.Format(dateFormat))
	// get billing amount for yesterday total usage fee
	_, amount, err := db.GetBillingCount(accountv1.Consumption, start, end)
	if err != nil {
		instance.logger.Error(err, "failed to get billing amount")
		return err
	}
	dailyClusterUsage.TotalUsageFee = float64(amount) / float64(account.CurrencyUnit)
	// get billing amount for yesterday hourly usage fee
	hourlyUsage := make([]float64, 24)
	for cnt := 0; cnt < 24; cnt++ {
		st := start.Add(time.Duration(cnt) * time.Hour)
		ed := start.Add(time.Duration(cnt+1) * time.Hour)
		_, amount, err := db.GetBillingCount(accountv1.Consumption, st, ed)
		if err != nil {
			instance.logger.Error(err, "failed to get billing amount")
			return err
		}
		hourlyUsage[cnt] = float64(amount) / float64(account.CurrencyUnit)
	}
	dailyClusterUsage.HourlyUsage = hourlyUsage
	c.DailyClusterUsage = dailyClusterUsage
	return nil
}

func GetYesterdayAndTodayMidnight() (time.Time, time.Time) {
	now := time.Now()
	midnightToday := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	midnightYesterday := midnightToday.AddDate(0, 0, -1)
	return midnightYesterday, midnightToday
}

func (c *collect) doResourceCollect(instance *TaskInstance) error {
	err := c.collectResource(instance)
	if err != nil {
		return err
	}
	c.CollectorInfo.InfoType = ResourceOnCluster
	c.CollectorInfo.ClusterResource = c.ClusterResource
	err = Push(c.url, c.CollectorInfo)
	if err != nil {
		return err
	}
	c.lastTimeForResource = time.Now().Unix()
	return nil
}

func (c *collect) doUsageCollect(instance *TaskInstance) error {
	err := c.collectUsage(instance)
	if err != nil {
		return err
	}
	c.CollectorInfo.InfoType = DailyUsage
	c.CollectorInfo.DailyUsage = c.DailyClusterUsage
	err = Push(c.url, c.CollectorInfo)
	if err != nil {
		return err
	}
	c.lastTimeForUsage = time.Now().Unix()
	return nil
}

func (c *collect) getPVResource(instance *TaskInstance, tnr *TotalNodesResource) error {
	pvList := &corev1.PersistentVolumeList{}
	err := instance.List(instance.ctx, pvList)
	if err != nil {
		instance.logger.Error(err, "failed to list pv")
		return err
	}
	for _, pv := range pvList.Items {
		storage := pv.Spec.Capacity[corev1.ResourceStorage]
		tnr.TotalPVCapacity.Add(storage)
	}
	return nil
}

func (c *collect) getNodeResource(instance *TaskInstance, tnr *TotalNodesResource) error {
	nodeList := &corev1.NodeList{}
	err := instance.List(instance.ctx, nodeList)
	if err != nil {
		instance.logger.Error(err, "failed to list node")
		return err
	}
	pool := ntf.NewPool(maxBatchSize)
	pool.Run(maxChannelSize)
	for _, node := range nodeList.Items {
		node := node
		pool.Add(func() {
			tnr.getCPUMemoryResource(&node)
		})
	}
	pool.Wait()
	tnr.TotalNodes = strconv.Itoa(len(nodeList.Items))
	return nil
}
