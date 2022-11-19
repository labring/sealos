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

	"github.com/imdario/mergo"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	"k8s.io/apimachinery/pkg/util/yaml"
	proxy "k8s.io/kube-proxy/config/v1alpha1"
	kubelet "k8s.io/kubelet/config/v1beta1"
	"k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm"
	kubeadmv1beta2 "k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm/v1beta2"
	kubeadmv1beta3 "k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm/v1beta3"
	kubeletconfig "k8s.io/kubernetes/pkg/kubelet/apis/config/v1beta1"
	proxyconfig "k8s.io/kubernetes/pkg/proxy/apis/config/v1alpha1"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
)

var scheme = k8sruntime.NewScheme()

func init() {
	utilruntime.Must(kubeadmv1beta2.AddToScheme(scheme))
	utilruntime.Must(kubeadmv1beta3.AddToScheme(scheme))
	utilruntime.Must(kubeletconfig.AddToScheme(scheme))
	utilruntime.Must(proxyconfig.AddToScheme(scheme))
}

// https://github.com/kubernetes/kubernetes/blob/master/cmd/kubeadm/app/apis/kubeadm/v1beta2/types.go
// Using map to overwrite Kubeadm configs

//nolint:all
type KubeadmConfig struct {
	kubeadm.InitConfiguration
	kubeadm.ClusterConfiguration
	kubeadm.JoinConfiguration
	proxy.KubeProxyConfiguration
	kubelet.KubeletConfiguration
	conversion struct {
		InitConfiguration      interface{}
		ClusterConfiguration   interface{}
		JoinConfiguration      interface{}
		KubeProxyConfiguration interface{}
		KubeletConfiguration   interface{}
	}
	ImageKubeVersion string
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
		defaultKubeadmConfig, err = LoadKubeadmConfigs(k.FetchDefaultKubeadmConfig(), DecodeCRDFromString)
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
		kubeadmConfig.KubeProxyConfiguration = *kubeProxyConfig.(*proxy.KubeProxyConfiguration)
	}
	kubeletConfig, err := decode(arg, KubeletConfiguration)
	if err != nil {
		return nil, err
	} else if kubeletConfig != nil {
		kubeadmConfig.KubeletConfiguration = *kubeletConfig.(*kubelet.KubeletConfiguration)
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

func TypeConversion(raw []byte, kind string) (interface{}, error) {
	obj := typeConversion(kind)
	if obj == nil {
		return nil, fmt.Errorf("not found type %s from %s", kind, string(raw))
	}
	if err := yaml.Unmarshal(raw, obj); err != nil {
		return nil, err
	}
	scheme.Default(obj)
	return obj, nil
}

func typeConversion(kind string) k8sruntime.Object {
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
		return &kubelet.KubeletConfiguration{}
	case KubeProxyConfiguration:
		return &proxy.KubeProxyConfiguration{}
	}
	return nil
}
