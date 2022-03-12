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

package runtime

import (
	"fmt"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/decode"
	"github.com/fanux/sealos/pkg/utils/logger"
	"sync"
)

type KubeadmRuntime struct {
	*sync.Mutex
	Vlog      int
	cluster   *v2.Cluster
	configs   []v2.Config
	resources []v2.Resource
	data      contants.Data
	work      contants.Worker
}

func (k *KubeadmRuntime) Init() error {
	return nil
}

type Interface interface {
	Init() error
}

func (k *KubeadmRuntime) pipeline(name string, pipeline []func() error) error {
	for _, f := range pipeline {
		if err := f(); err != nil {
			return fmt.Errorf("failed to %s %v", name, err)
		}
	}
	return nil
}

func newKubeadmRuntime(clusterName string) (Interface, error) {
	work := contants.NewWork(clusterName)
	clusterFile := work.Clusterfile()
	clusters, err := decode.Cluster(clusterFile)
	if err != nil {
		return nil, err
	}
	if len(clusters) != 1 {
		return nil, fmt.Errorf("cluster data length must is one")
	}
	configs, err := decode.Configs(clusterFile)
	if err != nil {
		return nil, err
	}
	resources, err := decode.Resource(clusterFile)
	if err != nil {
		return nil, err
	}

	k := &KubeadmRuntime{
		cluster:   &clusters[0],
		configs:   configs,
		resources: resources,
		data:      contants.NewData(clusterName),
		work:      work,
	}

	if logger.IsDebugModel() {
		k.Vlog = 6
	}
	return k, nil
}

// NewDefaultRuntime arg "clusterName" is the cluster name
func NewDefaultRuntime(clusterName string) (Interface, error) {
	return newKubeadmRuntime(clusterName)
}
