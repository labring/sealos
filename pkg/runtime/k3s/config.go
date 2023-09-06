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
	"bufio"
	"bytes"
	"io"
	"os"
	"path/filepath"

	"github.com/imdario/mergo"
	yamlutil "k8s.io/apimachinery/pkg/util/yaml"
	netutils "k8s.io/utils/net"
	"sigs.k8s.io/yaml"

	"github.com/labring/sealos/pkg/constants"
	fileutils "github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
)

var defaultMergeOpts = []func(*mergo.Config){
	mergo.WithOverride,
}

func defaultingConfig(c *Config) *Config {
	c.BindAddress = "0.0.0.0"
	c.HTTPSPort = 6443
	c.ClusterCIDR = []string{"10.42.0.0/16"}
	c.ServiceCIDR = []string{"10.43.0.0/16"}
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
	c.AgentConfig.ExtraKubeProxyArgs = []string{}
	c.AgentConfig.ExtraKubeletArgs = []string{}
	c.AgentConfig.PauseImage = "docker.io/rancher/pause:3.1"
	c.AgentConfig.PrivateRegistry = "/etc/rancher/k3s/registries.yaml"
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

func (k *K3s) overrideServerConfig(c *Config) *Config {
	c.AgentConfig.TokenFile = filepath.Join(k.pathResolver.ConfigsPath(), "token")
	c.AgentTokenFile = filepath.Join(k.pathResolver.ConfigsPath(), "agent-token")
	c.TLSSan = append(c.TLSSan, constants.DefaultAPIServerDomain)

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

//lint:ignore U1000 Ignore unused function temporarily for debugging
func (c *Config) getContainerRuntimeEndpoint() string {
	if c.AgentConfig.Docker {
		return "unix:///run/k3s/cri-dockerd/cri-dockerd.sock"
	} else if len(c.AgentConfig.ContainerRuntimeEndpoint) == 0 {
		return "unix:///run/k3s/containerd/containerd.sock"
	}
	return c.AgentConfig.ContainerRuntimeEndpoint
}

// ParseConfig return nil if data structure is not matched
func ParseConfig(data []byte) (*Config, error) {
	d := yamlutil.NewYAMLReader(bufio.NewReader(bytes.NewReader(data)))
	for {
		b, err := d.Read()
		if err != nil {
			if err == io.EOF {
				break
			}
			return nil, err
		}
		cfg, err := parseConfig(b)
		if err != nil {
			return nil, err
		}
		if cfg != nil {
			return cfg, nil
		}
	}
	return nil, nil
}

func parseConfig(data []byte) (*Config, error) {
	var c Config
	if err := yaml.Unmarshal(data, &c); err != nil {
		return nil, err
	}
	out, err := yaml.Marshal(&c)
	if err != nil {
		return nil, err
	}
	var m map[string]interface{}
	if err := yaml.Unmarshal(out, &m); err != nil {
		return nil, err
	}
	if len(m) == 0 {
		return nil, nil
	}
	return &c, nil
}
