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
	"path"

	"github.com/fanux/sealos/pkg/env"
	"github.com/fanux/sealos/pkg/remote"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/decode"
	fileutil "github.com/fanux/sealos/pkg/utils/file"
	"github.com/fanux/sealos/pkg/utils/logger"
	"github.com/fanux/sealos/pkg/utils/ssh"
	"github.com/fanux/sealos/pkg/utils/yaml"
	"github.com/pkg/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func (k *KubeadmRuntime) setRegistry() error {
	const registryCustomConfig = "registry.yml"
	etcPath := path.Join(k.data.RootFSPath(), contants.EtcDirName, registryCustomConfig)
	registryConfig, err := yaml.Unmarshal(etcPath)
	if err != nil {
		return err
	}
	domain, _, _ := unstructured.NestedString(registryConfig, "domain")
	port, _, _ := unstructured.NestedFloat64(registryConfig, "port")
	username, _, _ := unstructured.NestedString(registryConfig, "username")
	password, _, _ := unstructured.NestedString(registryConfig, "password")
	data, _, _ := unstructured.NestedString(registryConfig, "data")
	rConfig := RegistryConfig{
		IP:       k.getMaster0IP(),
		Domain:   domain,
		Port:     fmt.Sprintf("%d", int(port)),
		Username: username,
		Password: password,
		Data:     data,
	}
	k.registry = rConfig
	return nil
}

func (k *KubeadmRuntime) getImageLabels() (map[string]string, error) {
	data, err := k.imageService.Inspect(k.getImageName())
	if err != nil {
		return nil, err
	}
	return data.OCIv1.Config.Labels, err
}

func (k *KubeadmRuntime) getImageName() string {
	return k.cluster.Spec.Image
}

func (k *KubeadmRuntime) setClient() error {
	sshInterface := ssh.NewSSHClient(&k.cluster.Spec.SSH, true)
	k.client = &client{}
	k.sshInterface = sshInterface
	k.envInterface = env.NewEnvProcessor(k.cluster)
	k.ctlInterface = remote.New(k.getClusterName(), sshInterface)
	k.data = contants.NewData(k.getClusterName())
	render, err := k.getImageLabels()
	if err != nil {
		return err
	}
	k.bash = contants.NewBash(k.getClusterName(), render)
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
	k.config = &config{
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
