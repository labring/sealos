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

package manager

import (
	"encoding/json"
	"fmt"
	"regexp"
	"sync"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
)

const dateFormat = "2006-01-02"
const Memory = "memory"

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
	gpuRegex        *regexp.Regexp
	TotalPVCapacity resource.Quantity
	TotalMemory     resource.Quantity
	TotalCPU        resource.Quantity
	TotalGPU        resource.Quantity
}

type ClusterResource struct {
	Nodes  string `json:"nodes"`
	CPU    string `json:"cpu"`
	GPU    string `json:"gpu"`
	Memory string `json:"memery"`
	Disk   string `json:"disk"`
}

func (d *Date) UnmarshalJSON(data []byte) error {
	var str string
	err := json.Unmarshal(data, &str)
	if err != nil {
		return err
	}

	_, err = time.Parse(dateFormat, str)
	if err != nil {
		return fmt.Errorf("failed to parse date: %w", err)
	}

	*d = Date(str)
	return nil
}

func (d Date) MarshalJSON() ([]byte, error) {
	str := string(d)
	return json.Marshal(str)
}

func (tnr *TotalNodesResource) GetGPUCPUMemoryResource(node *corev1.Node, wg *sync.WaitGroup) {
	defer wg.Done()
	var nodeMemory resource.Quantity
	var nodeCPU resource.Quantity
	var nodeGPU resource.Quantity

	nodeMemory.Add(node.Status.Capacity[Memory])
	nodeCPU.Add(*node.Status.Capacity.Cpu())

	for resourceName, quantity := range node.Status.Capacity {
		if tnr.gpuRegex.MatchString(string(resourceName)) {
			nodeGPU.Add(quantity)
		}
	}

	tnr.mutex.Lock()
	defer tnr.mutex.Unlock()
	tnr.TotalMemory.Add(nodeMemory)
	tnr.TotalCPU.Add(nodeCPU)
	tnr.TotalGPU.Add(nodeGPU)
}

func NewTotalNodesResource(regexpStr string) TotalNodesResource {
	return TotalNodesResource{
		gpuRegex: regexp.MustCompile(regexpStr),
	}
}

func NewClusterResource() ClusterResource {
	return ClusterResource{}
}
