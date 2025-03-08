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
	"github.com/Masterminds/semver/v3"
	"golang.org/x/exp/slices"
	"k8s.io/apimachinery/pkg/util/sets"

	stringsutil "github.com/labring/sealos/pkg/utils/strings"

	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/maps"
)

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
	master0 := c.GetMaster0IPAndPort()
	if master0 == "" {
		return ""
	}
	return iputils.GetHostIP(master0)
}

func (c *Cluster) GetMaster0IPAndPort() string {
	if len(c.Spec.Hosts) == 0 {
		return ""
	}
	for _, host := range c.Spec.Hosts {
		for _, role := range host.Roles {
			if role == MASTER {
				if len(host.IPS) == 0 {
					return ""
				}
				return host.IPS[0]
			}
		}
	}
	return ""
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

func (c *Cluster) GetAllIPS() []string {
	var hosts []string
	for _, host := range c.Spec.Hosts {
		hosts = append(hosts, host.IPS...)
	}
	return hosts
}

func (c *Cluster) GetRootfsImage() *MountImage {
	for _, img := range c.Status.Mounts {
		if img.IsRootFs() {
			return &img
		}
	}
	return nil
}

func (c *Cluster) FindImage(name string) (int, *MountImage) {
	for i, img := range c.Status.Mounts {
		if img.ImageName == name {
			return i, &img
		}
	}
	return -1, nil
}

func (c *Cluster) ReplaceRootfsImage() {
	i1, i2 := -1, -1
	var v1, v2 string
	for i := range c.Status.Mounts {
		img := c.Status.Mounts[i]
		if img.IsRootFs() {
			if v1 == "" {
				v1, i1 = img.Labels[ImageKubeVersionKey], i
			} else {
				v2, i2 = img.Labels[ImageKubeVersionKey], i
			}
		}
	}
	//if no two rootfsImages, never replace
	if v1 == "" || v2 == "" {
		return
	}
	sv1 := semver.MustParse(v1)
	sv2 := semver.MustParse(v2)
	//if version format error, never replace
	if sv1.LessThan(sv2) {
		c.Status.Mounts[i1], c.Status.Mounts[i2] = c.Status.Mounts[i2], c.Status.Mounts[i1]
		c.Status.Mounts = append(c.Status.Mounts[:i2], c.Status.Mounts[i2+1:]...)
	} else if sv1.GreaterThan(sv2) {
		c.Status.Mounts[i2], c.Status.Mounts[i1] = c.Status.Mounts[i1], c.Status.Mounts[i2]
		c.Status.Mounts = append(c.Status.Mounts[:i1], c.Status.Mounts[i1+1:]...)
	}
}

func (c *Cluster) SetNewImages(images []string) {
	set := sets.NewString(c.Spec.Image...)
	for _, img := range images {
		if !set.Has(img) {
			c.Spec.Image = append(c.Spec.Image, img)
		}
	}
}

func (c *Cluster) GetAllLabels() map[string]string {
	var imageLabelMap map[string]string
	for _, img := range c.Status.Mounts {
		imageLabelMap = maps.Merge(imageLabelMap, img.Labels)
	}
	return imageLabelMap
}

func (c *Cluster) GetRolesByIP(ip string) []string {
	for _, host := range c.Spec.Hosts {
		if slices.Contains(host.IPS, ip) {
			return host.Roles
		}
	}
	return nil
}

func (c *Cluster) GetDistribution() string {
	root := c.GetRootfsImage()
	if root != nil {
		return maps.GetFromKeys(root.Labels, ImageDistributionKeys...)
	}
	return ""
}

const (
	defaultVIP          = "10.103.97.2"
	DefaultLvsCareImage = "sealos.hub:5000/sealos/lvscare:latest"
)

func (c *Cluster) GetVIP() string {
	root := c.GetRootfsImage()
	if root != nil {
		vip := maps.GetFromKeys(root.Labels, ImageVIPKey)
		return stringsutil.RenderTextWithEnv(vip, root.Env)
	}
	return defaultVIP
}

func (c *Cluster) GetImageEndpoint() string {
	root := c.GetRootfsImage()
	if root != nil {
		return root.Env[ImageImageEndpointSysKey]
	}
	return "/var/run/image-cri-shim.sock"
}

func (c *Cluster) GetLvscareImage() string {
	root := c.GetRootfsImage()
	if root != nil {
		vip := maps.GetFromKeys(root.Labels, ImageKubeLvscareImageKey)
		return stringsutil.RenderTextWithEnv(vip, root.Env)
	}
	return DefaultLvsCareImage
}

// UpdateCondition updates condition in cluster conditions using giving condition
// adds condition if not existed
func UpdateCondition(conditions []ClusterCondition, condition ClusterCondition) []ClusterCondition {
	if conditions == nil {
		conditions = make([]ClusterCondition, 0)
	}
	hasCondition := false
	for i, cond := range conditions {
		if cond.Type == condition.Type {
			hasCondition = true
			if cond.Reason != condition.Reason || cond.Status != condition.Status || cond.Message != condition.Message {
				conditions[i] = condition
			}
		}
	}
	if !hasCondition {
		conditions = append(conditions, condition)
	}
	return conditions
}

// UpdateCommandCondition updates condition in cluster conditions using giving condition, append only
func UpdateCommandCondition(cmdConditions []CommandCondition, cmdCondition CommandCondition) []CommandCondition {
	if cmdConditions == nil {
		cmdConditions = make([]CommandCondition, 0)
	}
	cmdConditions = append(cmdConditions, cmdCondition)
	return cmdConditions
}
