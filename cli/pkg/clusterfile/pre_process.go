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

package clusterfile

import (
	"bytes"
	"errors"

	"helm.sh/helm/v3/pkg/cli/values"
	"helm.sh/helm/v3/pkg/getter"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/runtime/decode"
	"github.com/labring/sealos/pkg/runtime/k3s"
	"github.com/labring/sealos/pkg/runtime/kubernetes/types"
	"github.com/labring/sealos/pkg/template"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	fileutil "github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
)

var ErrClusterFileNotExists = errors.New("the cluster file is not exist")

type PreProcessor interface {
	Process() error
}

func (c *ClusterFile) Process() (err error) {
	if !fileutil.IsExist(c.path) {
		return ErrClusterFileNotExists
	}
	c.once.Do(func() {
		err = func() error {
			clusterFileData, err := c.loadClusterFile()
			if err != nil {
				return err
			}
			logger.Debug("rendered Clusterfile: %+v", string(clusterFileData))
			return c.decode(clusterFileData)
		}()
	})
	return
}

func (c *ClusterFile) loadClusterFile() ([]byte, error) {
	body, err := fileutil.ReadAll(c.path)
	if err != nil {
		return nil, err
	}
	mergeValues, err := c.loadRenderValues()
	if err != nil {
		return nil, err
	}
	logger.Debug("loadClusterFile loadRenderValues: %+v", mergeValues)
	data := map[string]interface{}{
		"Values": mergeValues,
	}
	out := bytes.NewBuffer(nil)
	tpl, isOk, err := template.TryParse(string(body))
	if isOk {
		if err != nil {
			return nil, err
		}
		if err := tpl.Execute(out, data); err != nil {
			return nil, err
		}
	} else {
		out.Write(body)
	}

	for i := range c.customConfigFiles {
		configData, err := fileutil.ReadAll(c.customConfigFiles[i])
		if err != nil {
			return nil, err
		}
		out.WriteString("\n---\n")
		out.Write(configData)
	}

	for i := range c.customRuntimeConfigFiles {
		configData, err := fileutil.ReadAll(c.customRuntimeConfigFiles[i])
		if err != nil {
			return nil, err
		}
		out.WriteString("\n---\n")
		out.Write(configData)
	}
	return out.Bytes(), nil
}

func (c *ClusterFile) loadRenderValues() (map[string]interface{}, error) {
	valueOpt := &values.Options{
		ValueFiles: c.customValues,
		Values:     c.customSets,
	}
	return valueOpt.MergeValues([]getter.Provider{{
		Schemes: []string{"http", "https"},
		New:     getter.NewHTTPGetter,
	}})
}

func (c *ClusterFile) decode(data []byte) error {
	for _, fn := range []func([]byte) error{
		c.DecodeCluster, c.DecodeConfigs, c.DecodeRuntimeConfig,
	} {
		if err := fn(data); err != nil && err != ErrTypeNotFound {
			return err
		}
	}
	return nil
}

func (c *ClusterFile) DecodeCluster(data []byte) error {
	cluster, err := GetClusterFromDataCompatV1(data)
	if err != nil {
		return err
	}
	if cluster == nil {
		return ErrTypeNotFound
	}
	c.cluster = cluster
	return nil
}

func (c *ClusterFile) DecodeConfigs(data []byte) error {
	configs, err := CRDForBytes(data, constants.Config)
	if err != nil {
		return err
	}
	if configs == nil {
		return ErrTypeNotFound
	}
	cfgs := configs.([]v2.Config)
	c.configs = cfgs
	return nil
}

func (c *ClusterFile) DecodeRuntimeConfig(data []byte) error {
	// TODO: handling more types of runtime configuration
	cfg, _ := k3s.ParseConfig(data)
	if cfg != nil {
		c.runtimeConfig = cfg
	} else {
		kubeadmConfig, err := types.LoadKubeadmConfigs(string(data), false, decode.CRDFromString)
		if err != nil {
			return err
		}
		if kubeadmConfig == nil {
			return ErrTypeNotFound
		}
		c.runtimeConfig = kubeadmConfig
	}
	return nil
}
