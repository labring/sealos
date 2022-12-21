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
	"os"
	"strings"

	"github.com/labring/sealos/pkg/utils/logger"

	"helm.sh/helm/v3/pkg/cli/values"
	"helm.sh/helm/v3/pkg/getter"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/runtime"
	"github.com/labring/sealos/pkg/template"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	fileutil "github.com/labring/sealos/pkg/utils/file"
)

var ErrClusterFileNotExists = errors.New("the cluster file is not exist")

type PreProcessor interface {
	Process() error
}

func NewPreProcessor(path string) PreProcessor {
	return &ClusterFile{path: path}
}

func (c *ClusterFile) Process() (err error) {
	if !fileutil.IsExist(c.path) {
		return ErrClusterFileNotExists
	}
	c.once.Do(func() {
		err = func() error {
			for i := range c.customEnvs {
				kv := strings.SplitN(c.customEnvs[i], "=", 2)
				if len(kv) == 2 {
					_ = os.Setenv(kv[0], kv[1])
				}
			}
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

	for i := range c.customKubeadmFiles {
		configData, err := fileutil.ReadAll(c.customKubeadmFiles[i])
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
		c.DecodeCluster, c.DecodeConfigs, c.DecodeKubeadmConfig,
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
	c.Cluster = cluster
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
	c.Configs = cfgs
	return nil
}

func (c *ClusterFile) DecodeKubeadmConfig(data []byte) error {
	kubeadmConfig, err := runtime.LoadKubeadmConfigs(string(data), runtime.DecodeCRDFromString)
	if err != nil {
		return err
	}
	if kubeadmConfig == nil {
		return ErrTypeNotFound
	}
	c.KubeConfig = kubeadmConfig
	return nil
}
