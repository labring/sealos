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

func (c *Cluster) getData(key string) string {
	if c.Annotations == nil {
		c.Annotations = make(map[string]string)
	}
	data := c.Annotations[key]
	return data
}

func (c *Cluster) setData(key, value string) {
	if c.Annotations == nil {
		c.Annotations = make(map[string]string)
	}
	data := c.Annotations
	data[key] = value
	c.Annotations = data
}

func (c *Cluster) GetCertSANS() []string {
	data := c.getData("cluster_certSANS")
	if data != "" {
		return strings.Split(data, ",")
	}
	return []string{}
}
func (c *Cluster) SetCertSANS(certSans []string) {
	if certSans == nil {
		certSans = []string{}
	}
	c.setData("cluster_certSANS", strings.Join(certSans, ","))
}

func (c *Cluster) GetVip() string {
	return c.getData("cluster_vip")
}
func (c *Cluster) SetVip(vip string) {
	if vip == "" {
		vip = DefaultVIP
	}
	c.setData("cluster_vip", vip)
}

//nolint
func (c *Cluster) GetAPIServerDomain() string {
	return c.getData("cluster_apiServerDomain")
}
func (c *Cluster) SetAPIServerDomain(domain string) {
	if domain == "" {
		domain = DefaultAPIServerDomain
	}
	c.setData("cluster_apiServerDomain", domain)
}

func (c *Cluster) GetDNSDomain() string {
	return c.getData("cluster_DNSDomain")
}
func (c *Cluster) SetDNSDomain(domain string) {
	if domain == "" {
		domain = DefaultDNSDomain
	}
	c.setData("cluster_DNSDomain", domain)
}

func (c *Cluster) GetPodCIDR() string {
	return c.getData("cluster_podCIDR")
}
func (c *Cluster) SetPodCIDR(podCIDR string) {
	if podCIDR == "" {
		podCIDR = DefaultPodCIDR
	}
	c.setData("cluster_podCIDR", podCIDR)
}
func (c *Cluster) GetServiceCIDR() string {
	return c.getData("cluster_serviceCIDR")
}
func (c *Cluster) SetServiceCIDR(serviceCIDR string) {
	if serviceCIDR == "" {
		serviceCIDR = DefaultSvcCIDR
	}
	c.setData("cluster_serviceCIDR", serviceCIDR)
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
func (c *Cluster) SetRegistryAddress(registryDomain string, registryPort int) {
	if registryDomain == "" {
		registryDomain = DefaultRegistryDomain
	}
	if registryPort == 0 {
		registryPort = DefaultRegistryPort
	}
	c.Spec.Env = append(c.Spec.Env, fmt.Sprintf("%s=%s", DefaultVarCRIRegistryDomain, registryDomain))
	c.Spec.Env = append(c.Spec.Env, fmt.Sprintf("%s=%d", DefaultVarCRIRegistryPort, registryPort))
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

// ConvertEnv []string to map[string]interface{}, example [IP=127.0.0.1,IP=192.160.0.2,Key=value] will convert to {IP:[127.0.0.1,192.168.0.2],key:value}
func ConvertEnv(envList []string) (env map[string]interface{}) {
	temp := make(map[string][]string)
	env = make(map[string]interface{})

	for _, e := range envList {
		var kv []string
		if kv = strings.SplitN(e, "=", 2); len(kv) != 2 {
			continue
		}

		temp[kv[0]] = append(temp[kv[0]], kv[1])
	}

	for k, v := range temp {
		if len(v) > 1 {
			env[k] = v
			continue
		}
		if len(v) == 1 {
			env[k] = v[0]
		}
	}

	return
}

func (c *Cluster) GetMasterIPList() []string {
	return c.GetIPSByRole(MASTER)
}

func (c *Cluster) GetNodeIPList() []string {
	return c.GetIPSByRole(NODE)
}

func (c *Cluster) GetMaster0IP() string {
	if len(c.Spec.Hosts) == 0 {
		return ""
	}
	if len(c.Spec.Hosts[0].IPS) == 0 {
		return ""
	}
	return c.Spec.Hosts[0].IPS[0]
}

func (c *Cluster) GetMaster0IPAPIServer() string {
	master0 := c.GetMaster0IP()
	return fmt.Sprintf("https://%s:6443", master0)
}

func (c *Cluster) GetIPSByRole(role string) []string {
	var hosts []string
	for _, host := range c.Spec.Hosts {
		for _, hostRole := range host.Roles {
			if role == hostRole {
				hosts = append(hosts, host.IPS...)
				continue
			}
		}
	}
	return hosts
}

func (c *Cluster) GetRolesByIP(ip string) []string {
	var routes []string
	for _, host := range c.Spec.Hosts {
		if In(ip, host.IPS) {
			return host.Roles
		}
	}
	return routes
}
