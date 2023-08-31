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
	"path/filepath"

	"github.com/imdario/mergo"
	"sigs.k8s.io/yaml"

	"github.com/labring/sealos/pkg/constants"
)

var defaultMergeOpts = []func(*mergo.Config){
	mergo.WithOverride,
	mergo.WithAppendSlice,
}

var defaultConfig = &Config{
	BindAddress:           "0.0.0.0",
	HTTPSPort:             6443,
	ClusterCIDR:           []string{"10.42.0.0/16"},
	ServiceCIDR:           []string{"10.43.0.0/16"},
	ClusterDNS:            []string{"10.43.0.10"},
	ServiceNodePortRange:  "30000-32767",
	ClusterDomain:         constants.DefaultDNSDomain,
	DataDir:               "/var/lib/rancher/k3s",
	DisableCCM:            true,
	DisableHelmController: true,
	DisableNPC:            true,
	EgressSelectorMode:    "agent",
	FlannelBackend:        "vxlan",
	KubeConfigMode:        "0644",
	PreferBundledBin:      true,
	Disable:               []string{"servicelb", "traefik", "local-storage", "metrics-server"},
	AgentConfig: &AgentConfig{
		ExtraKubeletArgs:   []string{},
		ExtraKubeProxyArgs: []string{},
		PauseImage:         "docker.io/rancher/pause:3.1",
		PrivateRegistry:    "/etc/rancher/k3s/registries.yaml",
		Labels:             []string{"provisioner=k3s"},
	},
}

type callback func(*Config)

func merge(dst, src *Config) error {
	if src == nil {
		return nil
	}
	return mergo.Merge(dst, src, defaultMergeOpts...)
}

func setClusterInit(c *Config) {
	c.ClusterInit = true
}

func (k *K3s) overrideConfig(cfg *Config) {
	cfg.TokenFile = filepath.Join(k.pathResolver.ConfigsPath(), "token")
	cfg.AgentTokenFile = filepath.Join(k.pathResolver.ConfigsPath(), "agent-token")
	cfg.TLSSan = append(cfg.TLSSan, constants.DefaultAPIServerDomain)
}

func (k *K3s) getInitConfig(callbacks ...callback) (*Config, error) {
	cfg := *defaultConfig
	if err := merge(&cfg, k.config); err != nil {
		return nil, err
	}
	for i := range callbacks {
		callbacks[i](&cfg)
	}
	return &cfg, nil
}

// ParseConfig return nil if data structure is not matched
func ParseConfig(data []byte) (*Config, error) {
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
