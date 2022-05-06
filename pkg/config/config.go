// Copyright © 2021 Alibaba Group Holding Ltd.
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

	"github.com/labring/sealos/pkg/utils/maps"

	"github.com/labring/sealos/pkg/utils/contants"

	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"sigs.k8s.io/yaml"
)

/*
config in Clusterfile:

apiVersion: apps.sealyun.com/v1beta1
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

type Interface interface {
	// Dump Config in Clusterfile to the cluster rootfs disk
	Dump() error
}

type Dumper struct {
	Configs  []v1beta1.Config
	RootPath string
}

func NewConfiguration(rootPath string, configs []v1beta1.Config) Interface {
	return &Dumper{
		RootPath: rootPath,
		Configs:  configs,
	}
}
func NewDefaultConfiguration(clusterName string) Interface {
	return &Dumper{
		RootPath: contants.NewData(clusterName).RootFSPath(),
	}
}

func (c *Dumper) Dump() error {
	if len(c.Configs) == 0 {
		logger.Debug("clusterfile config is empty!")
		return nil
	}
	//if len(c.Configs) == 0 {
	//	configs, err := decode.Configs(clusterfile)
	//	if err != nil {
	//		return fmt.Errorf("failed to dump config %v", err)
	//	}
	//	c.Configs = configs
	//}

	if err := c.WriteFiles(); err != nil {
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
		configPath := filepath.Join(c.RootPath, config.Spec.Path)
		//only the YAML format is supported
		switch config.Spec.Strategy {
		case v1beta1.Merge:
			configData, err = getMergeConfigData(configPath, configData)
			if err != nil {
				return err
			}
		case v1beta1.Insert:
			configData, err = getAppendOrInsertConfigData(configPath, configData, true)
			if err != nil {
				return err
			}
		case v1beta1.Append:
			configData, err = getAppendOrInsertConfigData(configPath, configData, false)
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

func getAppendOrInsertConfigData(path string, data []byte, insert bool) ([]byte, error) {
	var configs [][]byte
	context, err := ioutil.ReadFile(filepath.Clean(path))
	if err != nil {
		return nil, err
	}
	if insert {
		configs = append(configs, data)
		configs = append(configs, context)
	} else {
		configs = append(configs, context)
		configs = append(configs, data)
	}
	return bytes.Join(configs, []byte("\n")), nil
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
		maps.DeepMerge(&configMap, &mergeConfigMap)

		cfg, err := yaml.Marshal(&configMap)
		if err != nil {
			return nil, err
		}
		configs = append(configs, cfg)
	}
	return bytes.Join(configs, []byte("\n---\n")), nil
}
