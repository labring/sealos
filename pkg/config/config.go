// Copyright © 2021 sealos.
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

package config

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"path/filepath"

	"github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/decode"
	"github.com/fanux/sealos/pkg/utils/file"
	"github.com/fanux/sealos/pkg/utils/logger"
	"sigs.k8s.io/yaml"
)

/*
config in Clusterfile:

apiVersion: sealer.aliyun.com/v1alpha1
kind: Config
metadata:
  name: redis-config
spec:
  path: etc/redis-config.yaml
  data: |
       redis-user: root
       redis-passwd: xxx

Dump will dump the config to etc/redis-config.yaml file
*/

const (
	Merge     = "merge"
	Overwrite = "overwrite"
)

type Interface interface {
	// Dump Config in Clusterfile to the cluster rootfs disk
	Dump(clusterfile string) error
}

type Dumper struct {
	Configs     []v1beta1.Config
	ClusterName string
}

func NewConfiguration(clusterName string) Interface {
	return &Dumper{
		ClusterName: clusterName,
	}
}

func (c *Dumper) Dump(clusterfile string) error {
	if clusterfile == "" {
		logger.Debug("clusterfile is empty!")
		return nil
	}
	configs, err := decode.Configs(clusterfile)
	if err != nil {
		return fmt.Errorf("failed to dump config %v", err)
	}
	c.Configs = configs
	err = c.WriteFiles()
	if err != nil {
		return fmt.Errorf("failed to write config files %v", err)
	}
	return nil
}

func (c *Dumper) WriteFiles() (err error) {
	if c.Configs == nil {
		logger.Debug("empty config found")
		return nil
	}
	for _, config := range c.Configs {
		configData := []byte(config.Spec.Data)
		configPath := filepath.Join(contants.DefaultTheClusterRootfsDir(c.ClusterName), config.Spec.Path)
		//only the YAML format is supported
		if config.Spec.Strategy == Merge {
			configData, err = getMergeConfigData(configPath, configData)
			if err != nil {
				return err
			}
		}
		err = file.WriteFile(configPath, configData)
		if err != nil {
			return fmt.Errorf("write config file failed %v", err)
		}
	}

	return nil
}

//merge the contents of data into the path file
func getMergeConfigData(path string, data []byte) ([]byte, error) {
	var configs [][]byte
	context, err := ioutil.ReadFile(filepath.Clean(path))
	if err != nil {
		return nil, err
	}
	mergeConfigMap := make(map[string]interface{})
	err = yaml.Unmarshal(data, &mergeConfigMap)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal merge map: %v", err)
	}
	for _, rawCfgData := range bytes.Split(context, []byte("---\n")) {
		configMap := make(map[string]interface{})
		err = yaml.Unmarshal(rawCfgData, &configMap)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal config: %v", err)
		}
		if len(configMap) == 0 {
			continue
		}
		deepMerge(&configMap, &mergeConfigMap)

		cfg, err := yaml.Marshal(&configMap)
		if err != nil {
			return nil, err
		}
		configs = append(configs, cfg)
	}
	return bytes.Join(configs, []byte("\n---\n")), nil
}

func deepMerge(dst, src *map[string]interface{}) {
	for srcK, srcV := range *src {
		dstV, ok := (*dst)[srcK]
		if !ok {
			continue
		}
		dV, ok := dstV.(map[string]interface{})
		// dstV is string type
		if !ok {
			(*dst)[srcK] = srcV
			continue
		}
		sV, ok := srcV.(map[string]interface{})
		if !ok {
			continue
		}
		deepMerge(&dV, &sV)
		(*dst)[srcK] = dV
	}
}
