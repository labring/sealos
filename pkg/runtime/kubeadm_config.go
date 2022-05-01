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

package runtime

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/yaml"

	"github.com/imdario/mergo"
	"github.com/labring/sealos/pkg/runtime/apis/kubeadm"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"
	"k8s.io/kube-proxy/config/v1alpha1"
	"k8s.io/kubelet/config/v1beta1"
)

// https://github.com/kubernetes/kubernetes/blob/master/cmd/kubeadm/app/apis/kubeadm/v1beta2/types.go
// Using map to overwrite Kubeadm configs

//nolint
type KubeadmConfig struct {
	kubeadm.InitConfiguration
	kubeadm.ClusterConfiguration
	kubeadm.JoinConfiguration
	v1alpha1.KubeProxyConfiguration
	v1beta1.KubeletConfiguration
	conversion struct {
		InitConfiguration    interface{}
		ClusterConfiguration interface{}
		JoinConfiguration    interface{}
	}
}

const (
	Cluster                = "Cluster"
	InitConfiguration      = "InitConfiguration"
	JoinConfiguration      = "JoinConfiguration"
	ClusterConfiguration   = "ClusterConfiguration"
	KubeProxyConfiguration = "KubeProxyConfiguration"
	KubeletConfiguration   = "KubeletConfiguration"
)

// LoadFromClusterfile :Load KubeadmConfig from Clusterfile.
// If it has `KubeadmConfig` in Clusterfile, load every field to each configuration.
// If Kubeadm raw Config in Clusterfile, just load it.
func (k *KubeadmConfig) LoadFromClusterfile(kubeadmConfig *KubeadmConfig) error {
	if kubeadmConfig == nil {
		return nil
	}
	k.APIServer.CertSANs = append(k.APIServer.CertSANs, kubeadmConfig.APIServer.CertSANs...)
	return mergo.Merge(k, kubeadmConfig)
}

// Merge Using github.com/imdario/mergo to merge KubeadmConfig to the CloudImage default kubeadm Config, overwrite some field.
// if defaultKubeadmConfig file not exist, use default raw kubeadm Config to merge k.KubeConfigSpec empty value
func (k *KubeadmConfig) Merge(kubeadmYamlPath string) error {
	var (
		defaultKubeadmConfig *KubeadmConfig
		err                  error
	)
	if kubeadmYamlPath == "" || !file.IsExist(kubeadmYamlPath) {
		defaultKubeadmConfig, err = LoadKubeadmConfigs(DefaultKubeadmConfig, DecodeCRDFromString)
		if err != nil {
			return err
		}
		return mergo.Merge(k, defaultKubeadmConfig)
	}
	defaultKubeadmConfig, err = LoadKubeadmConfigs(kubeadmYamlPath, DecodeCRDFromFile)
	if err != nil {
		return fmt.Errorf("failed to found kubeadm config from %s: %v", kubeadmYamlPath, err)
	}
	k.APIServer.CertSANs = append(k.APIServer.CertSANs, defaultKubeadmConfig.APIServer.CertSANs...)
	err = mergo.Merge(k, defaultKubeadmConfig)
	if err != nil {
		return fmt.Errorf("failed to merge kubeadm config: %v", err)
	}
	//using the DefaultKubeadmConfig configuration merge
	return k.Merge("")
}

func LoadKubeadmConfigs(arg string, decode func(arg string, kind string) (interface{}, error)) (*KubeadmConfig, error) {
	kubeadmConfig := &KubeadmConfig{}
	initConfig, err := decode(arg, InitConfiguration)
	if err != nil {
		return nil, err
	} else if initConfig != nil {
		kubeadmConfig.InitConfiguration = *initConfig.(*kubeadm.InitConfiguration)
	}
	clusterConfig, err := decode(arg, ClusterConfiguration)
	if err != nil {
		return nil, err
	} else if clusterConfig != nil {
		kubeadmConfig.ClusterConfiguration = *clusterConfig.(*kubeadm.ClusterConfiguration)
	}
	kubeProxyConfig, err := decode(arg, KubeProxyConfiguration)
	if err != nil {
		return nil, err
	} else if kubeProxyConfig != nil {
		kubeadmConfig.KubeProxyConfiguration = *kubeProxyConfig.(*v1alpha1.KubeProxyConfiguration)
	}
	kubeletConfig, err := decode(arg, KubeletConfiguration)
	if err != nil {
		return nil, err
	} else if kubeletConfig != nil {
		kubeadmConfig.KubeletConfiguration = *kubeletConfig.(*v1beta1.KubeletConfiguration)
	}
	joinConfig, err := decode(arg, JoinConfiguration)
	if err != nil {
		return nil, err
	} else if joinConfig != nil {
		kubeadmConfig.JoinConfiguration = *joinConfig.(*kubeadm.JoinConfiguration)
	}
	return kubeadmConfig, nil
}

func NewKubeadmConfig() interface{} {
	return &KubeadmConfig{}
}

func DecodeCRDFromFile(filePath string, kind string) (interface{}, error) {
	file, err := os.Open(filepath.Clean(filePath))
	if err != nil {
		return nil, fmt.Errorf("failed to dump Config %v", err)
	}
	defer func() {
		if err := file.Close(); err != nil {
			logger.Warn("failed to dump Config close clusterfile failed %v", err)
		}
	}()
	return DecodeCRDFromReader(file, kind)
}

func DecodeCRDFromReader(r io.Reader, kind string) (interface{}, error) {
	d := yaml.NewYAMLOrJSONDecoder(r, 4096)

	for {
		ext := k8sruntime.RawExtension{}
		if err := d.Decode(&ext); err != nil {
			if err == io.EOF {
				break
			}
			return nil, err
		}
		// TODO: This needs to be able to handle object in other encodings and schemas.
		ext.Raw = bytes.TrimSpace(ext.Raw)
		if len(ext.Raw) == 0 || bytes.Equal(ext.Raw, []byte("null")) {
			continue
		}
		metaType := metav1.TypeMeta{}
		err := yaml.Unmarshal(ext.Raw, &metaType)
		if err != nil {
			return nil, fmt.Errorf("decode Cluster failed %v", err)
		}
		// ext.Raw
		if metaType.Kind == kind {
			return TypeConversion(ext.Raw, kind)
		}
	}
	return nil, nil
}

func DecodeCRDFromString(config string, kind string) (interface{}, error) {
	return DecodeCRDFromReader(strings.NewReader(config), kind)
}

func TypeConversion(raw []byte, kind string) (i interface{}, err error) {
	i = typeConversion(kind)
	if i == nil {
		return nil, fmt.Errorf("not found type %s from %s", kind, string(raw))
	}
	return i, yaml.Unmarshal(raw, i)
}

func typeConversion(kind string) interface{} {
	switch kind {
	case Cluster:
		return &v2.Cluster{}
	case InitConfiguration:
		return &kubeadm.InitConfiguration{}
	case JoinConfiguration:
		return &kubeadm.JoinConfiguration{}
	case ClusterConfiguration:
		return &kubeadm.ClusterConfiguration{}
	case KubeletConfiguration:
		return &v1beta1.KubeletConfiguration{}
	case KubeProxyConfiguration:
		return &v1alpha1.KubeProxyConfiguration{}
	}
	return nil
}
