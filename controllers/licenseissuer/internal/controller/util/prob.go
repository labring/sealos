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

import "sync"

// Probe is an interface for a probe check
type Probe interface {
	Probe() bool
}

// ProbeFor return the Probe interface for the given task type
func ProbeFor(taskType task) Probe {
	switch taskType {
	case Collector, DataSync, Notice:
		return ProbeForInit()
	case NetWorkConfig:
		return ProbeForNetWork()
	default:
		return nil
	}
}

// NetworkProbe is an interface for a network probe check

type NetworkProbe interface {
	Probe
	ProbeForNetWork(url string)
}

type networkProbe struct {
	options OptionsReadWrite
}

type networkConfig struct {
	url string
	np  NetworkProbe
}

func NewNetworkConfig() *networkConfig {
	return &networkConfig{
		np: GetNetworkProbe(),
	}
}

func (n *networkConfig) probe(instance *TaskInstance) error {
	urlMap, err := GetURL(instance.ctx, instance.Client)
	if err != nil {
		instance.logger.Info("get url error", "error", err)
		return err
	}
	n.url = urlMap[NetworkProbeURL]
	n.np.ProbeForNetWork(n.url)
	return nil
}

func (n *networkProbe) Probe() bool {
	return options.GetNetWorkOptions().EnableExternalNetWork
}

func (n *networkProbe) ProbeForNetWork(url string) {
	_, err := Get(url)
	if err != nil {
		// The network is not available
		n.options.SetNetworkConfig(false)
		return
	}
	// The network is available
	n.options.SetNetworkConfig(true)
}

var onceForNetworkProbe sync.Once
var networkProbeInstance networkProbe

var _ NetworkProbe = &networkProbe{}
var _ Probe = &networkProbe{}

func GetNetworkProbe() NetworkProbe {
	onceForNetworkProbe.Do(func() {
		networkProbeInstance = networkProbe{
			options: GetOptionsReadWrite(),
		}
	})
	return &networkProbeInstance
}

func ProbeForNetWork() Probe {
	return GetNetworkProbe()
}
