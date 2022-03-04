/*
Copyright 2022 cuisongliu@qq.com.

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

package v1beta1

import (
	"fmt"
	"strings"
)

func (c *Cluster) initAnnotations() map[string]string {
	if c.Annotations == nil {
		c.Annotations = map[string]string{}
	}
	return c.Annotations
}

func (c *Cluster) GetCertSANS() []string {
	data := c.initAnnotations()["cluster_certSANS"]
	return strings.Split(data, ",")
}
func (c *Cluster) SetCertSANS(certSans []string) {
	if certSans == nil {
		certSans = []string{}
	}
	data := c.initAnnotations()
	data["cluster_certSANS"] = strings.Join(certSans, ",")
	c.Annotations = data
}

func (c *Cluster) GetVip() string {
	return c.initAnnotations()["cluster_vip"]
}
func (c *Cluster) SetVip(vip string) {
	if vip == "" {
		vip = DefaultVIP
	}
	data := c.initAnnotations()
	data["cluster_vip"] = vip
	c.Annotations = data
}

func (c *Cluster) GetAPIServerDomain() string {
	return c.initAnnotations()["cluster_apiServerDomain"]
}
func (c *Cluster) SetAPIServerDomain(domain string) {
	if domain == "" {
		domain = DefaultAPIServerDomain
	}
	data := c.initAnnotations()
	data["cluster_apiServerDomain"] = domain
	c.Annotations = data
}
func (c *Cluster) GetPodCIDR() string {
	return c.initAnnotations()["cluster_podCIDR"]
}
func (c *Cluster) SetPodCIDR(podCIDR string) {
	if podCIDR == "" {
		podCIDR = DefaultPodCIDR
	}
	data := c.initAnnotations()
	data["cluster_podCIDR"] = podCIDR
	c.Annotations = data
}
func (c *Cluster) GetServiceCIDR() string {
	return c.initAnnotations()["cluster_serviceCIDR"]
}
func (c *Cluster) SetServiceCIDR(serviceCIDR string) {
	if serviceCIDR == "" {
		serviceCIDR = DefaultSvcCIDR
	}
	data := c.initAnnotations()
	data["cluster_serviceCIDR"] = serviceCIDR
	c.Annotations = data
}
func (c *Cluster) GetSSH() ClusterSSH {
	return c.Spec.SSH
}
func (c *Cluster) SetSSH(ssh ClusterSSH) {
	c.Spec.SSH = ssh
}
func (c *Cluster) GetHosts() []ClusterHost {
	return c.Spec.Hosts
}
func (c *Cluster) SetHosts(hosts []ClusterHost) {
	c.Spec.Hosts = hosts
}

func (c *Cluster) SetCNIInterface(cniInterface string) {
	if cniInterface == "" {
		cniInterface = DefaultCNIInterface
	}
	c.Spec.Env = append(c.Spec.Env, fmt.Sprintf("%s=%s", DefaultVarCNIInterface, cniInterface))
}
func (c *Cluster) SetCNIMTU(cniMTU string) {
	if cniMTU == "" {
		cniMTU = DefaultCNIMTU
	}
	c.Spec.Env = append(c.Spec.Env, fmt.Sprintf("%s=%s", DefaultVarCNIMTU, cniMTU))
}
func (c *Cluster) SetCNIIPIP(ipip bool) {
	cniIPIP := ""
	if ipip {
		cniIPIP = DefaultCNIIPIPTrue
	} else {
		cniIPIP = DefaultCNIIPIPFalse
	}
	c.Spec.Env = append(c.Spec.Env, fmt.Sprintf("%s=%s", DefaultVarCNIIPIP, cniIPIP))
}
func (c *Cluster) SetCRIData(criData string) {
	if criData == "" {
		criData = DefaultCRIData
	}
	c.Spec.Env = append(c.Spec.Env, fmt.Sprintf("%s=%s", DefaultVarCRIData, criData))
}
func (c *Cluster) SetRegistryAddress(registryAddress string) {
	var registryDomain, registryPort string
	if registryAddress != "" {
		data := strings.Split(registryAddress, ":")
		if len(data) == 2 {
			registryDomain = data[0]
			registryPort = data[1]
		}
	}
	if len(registryDomain) == 0 && len(registryPort) == 0 {
		registryDomain = DefaultRegistryDomain
		registryPort = DefaultRegistryPort
	}
	c.Spec.Env = append(c.Spec.Env, fmt.Sprintf("%s=%s", DefaultVarCRIRegistryDomain, registryDomain))
	c.Spec.Env = append(c.Spec.Env, fmt.Sprintf("%s=%s", DefaultVarCRIRegistryPort, registryPort))

}
func (c *Cluster) SetRegistryConfig(registryConfig string) {
	if registryConfig == "" {
		registryConfig = DefaultRegistryConfig
	}
	c.Spec.Env = append(c.Spec.Env, fmt.Sprintf("%s=%s", DefaultVarCRIRegistryConfig, registryConfig))
}
func (c *Cluster) SetRegistryData(registryData string) {
	if registryData == "" {
		registryData = DefaultRegistryData
	}
	c.Spec.Env = append(c.Spec.Env, fmt.Sprintf("%s=%s", DefaultVarCRIRegistryData, registryData))

}
func (c *Cluster) SetRegistryUsername(registryUsername string) {
	c.Spec.Env = append(c.Spec.Env, fmt.Sprintf("%s=%s", DefaultVarCRIRegistryUsername, registryUsername))
}
func (c *Cluster) SetRegistryPassword(registryPassword string) {
	c.Spec.Env = append(c.Spec.Env, fmt.Sprintf("%s=%s", DefaultVarCRIRegistryPassword, registryPassword))

}
