// Copyright © 2023 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package k3s

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"

	"github.com/emirpasic/gods/sets/linkedhashset"

	"github.com/imdario/mergo"
	netutils "k8s.io/utils/net"

	"github.com/labring/sealos/pkg/constants"
	fileutils "github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/yaml"
)

var defaultMergeOpts = []func(*mergo.Config){
	mergo.WithOverride,
}

func defaultingConfig(c *Config) *Config {
	c.BindAddress = "0.0.0.0"
	c.HTTPSPort = constants.DefaultAPIServerPort
	c.ClusterCIDR = []string{"10.42.0.0/16"}
	c.ServiceCIDR = []string{"10.96.0.0/16"}
	c.ClusterDomain = constants.DefaultDNSDomain
	c.DisableCCM = true
	c.DisableHelmController = true
	c.DisableNPC = true
	c.EgressSelectorMode = "agent"
	c.FlannelBackend = "vxlan"
	c.KubeConfigMode = "0644"
	c.Disable = []string{"servicelb", "traefik", "local-storage", "metrics-server"}
	defaultingAgentConfig(c)
	return c
}

func defaultingAgentConfig(c *Config) *Config {
	if c.AgentConfig == nil {
		c.AgentConfig = &AgentConfig{}
	}
	c.AgentConfig.PreferBundledBin = true
	c.AgentConfig.DataDir = defaultDataDir
	c.AgentConfig.ExtraKubeProxyArgs = []string{}
	c.AgentConfig.ExtraKubeletArgs = []string{}
	c.AgentConfig.PauseImage = "docker.io/rancher/pause:3.1"
	c.AgentConfig.PrivateRegistry = defaultRegistryConfigPath
	c.AgentConfig.Labels = []string{"sealos.io/distribution=k3s"}

	return c
}

// avoid unknown flags
func removeServerFlagsInAgentConfig(c *Config) *Config {
	agentConfig := *c.AgentConfig
	return &Config{AgentConfig: &agentConfig}
}

type callback func(*Config) *Config

func merge(dst, src *Config) error {
	if src == nil || dst == nil {
		return nil
	}
	return mergo.Merge(dst, src, defaultMergeOpts...)
}

func setClusterInit(c *Config) *Config {
	c.ClusterInit = true
	return c
}

func (k *K3s) merge(c *Config) *Config {
	if err := func() error {
		defaultCfg := filepath.Join(k.pathResolver.RootFSEtcPath(), defaultRootFsK3sFileName)
		if !fileutils.IsExist(defaultCfg) {
			return nil
		}
		data, err := os.ReadFile(defaultCfg)
		if err != nil {
			return err
		}
		parseCfg, err := ParseConfig(data)
		if err != nil {
			return err
		}
		return merge(c, parseCfg)
	}(); err != nil {
		logger.Error("failed to merge in place config file: %v", err)
	}
	if err := merge(c, k.config); err != nil {
		logger.Error("failed to merge provide config: %v", err)
	}
	return c
}

func (k *K3s) overrideCertSans(c *Config) *Config {
	masterIPs := iputils.GetHostIPs(k.cluster.GetMasterIPList())
	var certSans []string
	certSans = append(certSans, "127.0.0.1")
	certSans = append(certSans, constants.DefaultAPIServerDomain)
	certSans = append(certSans, k.cluster.GetVIP())
	certSans = append(certSans, masterIPs...)
	certSans = append(certSans, c.TLSSan...)
	certSans = append(certSans, c.ServiceCIDR...)
	certSans = append(certSans, c.ClusterDomain)
	c.TLSSan = certSans
	return c
}

func (k *K3s) sealosCfg(c *Config) *Config {
	vip := k.cluster.GetVIP()
	kubeProxy := linkedhashset.New()
	for _, v := range c.AgentConfig.ExtraKubeProxyArgs {
		kubeProxy.Add(v)
	}
	kubeProxy.Add(fmt.Sprintf("%s=%s", "ipvs-exclude-cidrs", fmt.Sprintf("%s/32", vip)))
	kubeProxy.Add(fmt.Sprintf("%s=%s", "proxy-mode", "ipvs"))

	var allArgs []string
	for _, v := range kubeProxy.Values() {
		allArgs = append(allArgs, v.(string))
	}
	c.AgentConfig.ExtraKubeProxyArgs = allArgs
	return c
}

func (k *K3s) overrideServerConfig(c *Config) *Config {
	c.AgentConfig.TokenFile = filepath.Join(k.pathResolver.ConfigsPath(), "token")
	c.AgentTokenFile = filepath.Join(k.pathResolver.ConfigsPath(), "agent-token")

	if len(c.ClusterDNS) == 0 && len(c.ServiceCIDR) > 0 {
		svcSubnetCIDR, err := netutils.ParseCIDRs(c.ServiceCIDR)
		if err == nil {
			clusterDNS, err := netutils.GetIndexedIP(svcSubnetCIDR[0], 10)
			if err == nil {
				c.ClusterDNS = []string{clusterDNS.String()}
			}
		}
	}
	return c
}

func (k *K3s) overrideAgentConfig(c *Config) *Config {
	c.AgentConfig.TokenFile = filepath.Join(k.pathResolver.ConfigsPath(), "agent-token")
	return c
}

func (k *K3s) getInitConfig(callbacks ...callback) (*Config, error) {
	cfg := &Config{}
	for i := range callbacks {
		cfg = callbacks[i](cfg)
	}
	return cfg, nil
}

// ParseConfig return nil if data structure is not matched
func ParseConfig(data []byte) (*Config, error) {
	var cfg Config
	if err := yaml.Unmarshal(bytes.NewBuffer(data), &cfg); err != nil {
		return nil, err
	}
	out, err := yaml.Marshal(&cfg)
	if err != nil {
		return nil, err
	}
	isNil, err := yaml.IsNil(out)
	if err != nil {
		return nil, err
	}
	if isNil {
		return nil, nil
	}
	return &cfg, nil
}
