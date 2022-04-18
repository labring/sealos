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

	"github.com/fanux/sealos/pkg/utils/iputils"
)

func (c *Cluster) GetSSH() SSH {
	return c.Spec.SSH
}
func (c *Cluster) SetSSH(ssh SSH) {
	c.Spec.SSH = ssh
}
func (c *Cluster) GetHosts() []Host {
	return c.Spec.Hosts
}
func (c *Cluster) SetHosts(hosts []Host) {
	c.Spec.Hosts = hosts
}

func (c *Cluster) GetMasterIPList() []string {
	return iputils.GetHostIPs(c.GetIPSByRole(MASTER))
}
func (c *Cluster) GetMasterIPAndPortList() []string {
	return c.GetIPSByRole(MASTER)
}

func (c *Cluster) GetNodeIPList() []string {
	return iputils.GetHostIPs(c.GetIPSByRole(NODE))
}

func (c *Cluster) GetNodeIPAndPortList() []string {
	return c.GetIPSByRole(NODE)
}

func (c *Cluster) GetMaster0IP() string {
	if len(c.Spec.Hosts) == 0 {
		return ""
	}
	if len(c.Spec.Hosts[0].IPS) == 0 {
		return ""
	}
	return iputils.GetHostIP(c.Spec.Hosts[0].IPS[0])
}

func (c *Cluster) GetMaster0IPAndPort() string {
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
