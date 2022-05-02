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

	"github.com/labring/sealos/pkg/runtime"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/contants"
	"github.com/labring/sealos/pkg/utils/decode"
	fileutil "github.com/labring/sealos/pkg/utils/file"
)

type PreProcessor interface {
	Process() error
}

func NewPreProcessor(path string) PreProcessor {
	return &ClusterFile{path: path}
}

func (c *ClusterFile) Process() error {
	if !fileutil.IsExist(c.path) {
		return errors.New("the cluster file is not exist, make sure you cluster is install")
	}
	clusterFileData, err := fileutil.ReadAll(c.path)
	if err != nil {
		return err
	}
	err = c.DecodeCluster(clusterFileData)
	if err != nil && err != ErrTypeNotFound {
		return err
	}
	err = c.DecodeConfigs(clusterFileData)
	if err != nil && err != ErrTypeNotFound {
		return err
	}
	err = c.DecodeKubeadmConfig(clusterFileData)
	if err != nil && err != ErrTypeNotFound {
		return err
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
	configs, err := decode.CRDForBytes(data, contants.Config)
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
