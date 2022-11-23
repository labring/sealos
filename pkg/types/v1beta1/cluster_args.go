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

	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/maps"
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
	return iputils.GetHostIPs(c.GetMasterIPAndPortList())
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

func (c *Cluster) GetRegistryIP() string {
	return iputils.GetHostIP(c.GetRegistryIPAndPort())
}

func (c *Cluster) GetRegistryIPAndPort() string {
	return c.GetRegistryIPAndPortList()[0]
}

func (c *Cluster) GetRegistryIPList() []string {
	return iputils.GetHostIPs(c.GetRegistryIPAndPortList())
}

func (c *Cluster) GetRegistryIPAndPortList() []string {
	ret := c.GetIPSByRole(REGISTRY)
	if len(ret) == 0 {
		ret = []string{c.GetMaster0IPAndPort()}
	}
	return ret
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
			}
		}
	}
	return hosts
}

func (c *Cluster) GetRootfsImage(defaultMount string) *MountImage {
	var image *MountImage
	if c.Status.Mounts != nil {
		for _, img := range c.Status.Mounts {
			if img.Type == RootfsImage {
				image = &img
				break
			}
		}
	}
	if image == nil {
		image = &MountImage{
			Name:       fmt.Sprintf("%s-%d", c.Name, 0),
			Type:       RootfsImage,
			ImageName:  c.Spec.Image[0],
			MountPoint: defaultMount,
		}
	}
	return image
}

func (c *Cluster) FindImage(targetImage string) *MountImage {
	var image *MountImage
	if c.Status.Mounts != nil {
		for _, img := range c.Status.Mounts {
			if img.ImageName == targetImage {
				image = &img
				break
			}
		}
	}
	return image
}

func (c *Cluster) SetMountImage(targetMount *MountImage) {
	tgMount := targetMount.DeepCopy()
	if c.Status.Mounts != nil {
		if tgMount != nil {
			hasMount := false
			for i, img := range c.Status.Mounts {
				if img.Name == tgMount.Name && img.Type == tgMount.Type {
					c.Status.Mounts[i] = *tgMount
					hasMount = true
					break
				}
			}
			if !hasMount {
				c.Status.Mounts = append(c.Status.Mounts, *tgMount)
			}
		}
	}
}

func (c *Cluster) GetImageLabels() map[string]string {
	var imageLabelMap map[string]string
	for _, img := range c.Status.Mounts {
		imageLabelMap = maps.MergeMap(imageLabelMap, img.Labels)
	}
	return imageLabelMap
}

func (c *Cluster) GetImageEnvs() map[string]string {
	var imageEnvMap map[string]string
	for _, img := range c.Status.Mounts {
		imageEnvMap = maps.MergeMap(imageEnvMap, img.Env)
	}
	return imageEnvMap
}

func (c *Cluster) GetAppImage(defaultImageName, defaultMount string) *MountImage {
	var image *MountImage
	if c.Status.Mounts != nil {
		for _, img := range c.Status.Mounts {
			if img.Type == AppImage && img.ImageName == defaultImageName {
				image = &img
				break
			}
		}
	}
	if image == nil {
		for i, img := range c.Spec.Image {
			if img == defaultImageName {
				image = &MountImage{
					Name:       fmt.Sprintf("%s-%d", c.Name, i),
					Type:       AppImage,
					ImageName:  defaultImageName,
					MountPoint: defaultMount,
				}
			}
		}
	}
	return image
}

func (c *Cluster) HasAppImage() bool {
	if c.Status.Mounts != nil {
		for _, img := range c.Status.Mounts {
			if img.Type == AppImage {
				return true
			}
		}
	}
	return false
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
