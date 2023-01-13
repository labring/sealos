/*
Copyright 2023 cuisongliu@qq.com.

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

package apply

import "github.com/labring/sealos/pkg/runtime"

func NewClusterFromGenArgs(imageName []string, args *RunArgs) ([]interface{}, error) {
	cluster := initCluster(args.ClusterName)
	c := &ClusterArgs{
		clusterName: args.ClusterName,
		cluster:     cluster,
	}
	if err := c.runArgs(imageName, args); err != nil {
		return nil, err
	}
	kubeadmcfg := &runtime.KubeadmConfig{}
	if err := kubeadmcfg.Merge(""); err != nil {
		return nil, err
	}
	// todo: only generate configurations of the corresponding components by passing parameters
	return []interface{}{c.cluster,
		kubeadmcfg.InitConfiguration,
		kubeadmcfg.ClusterConfiguration,
		kubeadmcfg.JoinConfiguration,
		kubeadmcfg.KubeProxyConfiguration,
		kubeadmcfg.KubeletConfiguration,
	}, nil
}
