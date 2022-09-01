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
	"errors"
	"sync"

	"github.com/labring/sealos/pkg/runtime"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

var ErrTypeNotFound = errors.New("no corresponding type structure was found")

type ClusterFile struct {
	path              string
	customConfigFiles []string
	customValues      []string
	customSets        []string
	customEnvs        []string
	Cluster           *v2.Cluster
	Configs           []v2.Config
	KubeConfig        *runtime.KubeadmConfig
	//Plugins    []v1.Plugin
	once sync.Once
}

type Interface interface {
	PreProcessor
	GetCluster() *v2.Cluster
	GetConfigs() []v2.Config
	//GetPlugins() []v1.Plugin
	GetKubeadmConfig() *runtime.KubeadmConfig
}

func (c *ClusterFile) GetCluster() *v2.Cluster {
	return c.Cluster
}

func (c *ClusterFile) GetConfigs() []v2.Config {
	return c.Configs
}

//func (c *ClusterFile) GetPlugins() []v1.Plugin {
//	return c.Plugins
//}

func (c *ClusterFile) GetKubeadmConfig() *runtime.KubeadmConfig {
	return c.KubeConfig
}

type OptionFunc func(*ClusterFile)

func WithCustomConfigFiles(files []string) OptionFunc {
	return func(c *ClusterFile) {
		c.customConfigFiles = files
	}
}

func WithCustomValues(valueFiles []string) OptionFunc {
	return func(c *ClusterFile) {
		c.customValues = valueFiles
	}
}

func WithCustomSets(sets []string) OptionFunc {
	return func(c *ClusterFile) {
		c.customSets = sets
	}
}

func WithCustomEnvs(envs []string) OptionFunc {
	return func(c *ClusterFile) {
		c.customEnvs = envs
	}
}

func NewClusterFile(path string, opts ...OptionFunc) Interface {
	cf := &ClusterFile{
		path: path,
	}
	for _, opt := range opts {
		opt(cf)
	}
	return cf
}
