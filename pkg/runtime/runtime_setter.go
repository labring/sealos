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

	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/decode"
	fileutil "github.com/fanux/sealos/pkg/utils/file"
	"github.com/fanux/sealos/pkg/utils/logger"
	"github.com/pkg/errors"
)

func (k *KubeadmRuntime) setClient() error {
	k.client = &client{}
	k.data = contants.NewData(k.getClusterName())
	return nil
}

func (k *KubeadmRuntime) setData(clusterName string) error {
	clusterFile := contants.Clusterfile(clusterName)
	clusters, err := decode.Cluster(clusterFile)
	if err != nil {
		return err
	}
	if len(clusters) != 1 {
		return fmt.Errorf("cluster data length must is one")
	}
	data, err := fileutil.ReadAll(clusterFile)
	if err != nil {
		return errors.Wrap(err, "read cluster file data failed")
	}
	kubeadmConfig, err := LoadKubeadmConfigs(string(data), DecodeCRDFromString)
	if err != nil {
		return err
	}
	k.cluster = &clusters[0]
	k.KubeadmConfig = &KubeadmConfig{}
	k.Config = &Config{
		ClusterFileKubeConfig: kubeadmConfig,
		apiServerDomain:       DefaultAPIServerDomain,
	}
	if err = k.checkList(); err != nil {
		return err
	}
	if logger.IsDebugModel() {
		k.vlog = 6
	}

	return nil
}

func (k *KubeadmRuntime) checkList() error {
	if len(k.cluster.Spec.Hosts) == 0 {
		return fmt.Errorf("master hosts cannot be empty")
	}
	if k.getMaster0IP() == "" {
		return fmt.Errorf("master hosts ip cannot be empty")
	}
	return nil
}
