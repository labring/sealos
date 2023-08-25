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
	"sync"
)

// Probe is an interface for a probe check
type Probe interface {
	Probe() bool
}

// ProbeFor return the Probe interface for the given task type
func ProbeFor(taskType task) []Probe {
	switch taskType {
	case Collector, DataSync, Notice:
		return []Probe{ProbeForInit(), ProbeForNetWork(), ProbeForRegister()}
	case Register:
		return []Probe{ProbeForInit()}
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

type NetworkConfig struct {
	url string
	np  NetworkProbe
}

func NewNetworkConfig() *NetworkConfig {
	return &NetworkConfig{
		np: GetNetworkProbe(),
	}
}

func (n *NetworkConfig) probe(instance *TaskInstance) error {
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

type RegisterProbe interface {
	Probe
	SetFlag(flag bool)
}

type RegisterWork struct {
	probe RegisterProbe
}

type registerProbe struct {
	flag bool
}

var onceForRegisterProbe sync.Once
var registerProbeInstance registerProbe

var _ RegisterProbe = &registerProbe{}
var _ Probe = &registerProbe{}

func GetRegisterProbe() RegisterProbe {
	onceForRegisterProbe.Do(func() {
		registerProbeInstance = registerProbe{}
	})
	return &registerProbeInstance
}

func NewRegister() *RegisterWork {
	return &RegisterWork{
		probe: GetRegisterProbe(),
	}
}

func (r *RegisterWork) register(instance *TaskInstance) error {
	return r.registerToCloud(instance)
}

func (r *RegisterWork) registerToCloud(instance *TaskInstance) error {
	uid, urlMap, err := GetUIDURL(instance.ctx, instance.Client)
	if err != nil {
		instance.logger.Info("get uid and url error", "error", err)
		return err
	}
	rr := RegisterRequest{
		UID: uid,
	}
	// send info to cloud
	err = Push(urlMap[RegisterURL], rr)
	if err != nil {
		instance.logger.Info("write to cloud error", "error", err)
		return err
	}
	r.probe.SetFlag(true)
	return nil
}

func (r *registerProbe) SetFlag(flag bool) {
	r.flag = flag
}

func ProbeForRegister() Probe {
	return GetRegisterProbe()
}

func (r *registerProbe) Probe() bool {
	return r.flag
}
