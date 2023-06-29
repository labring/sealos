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

	versionutil "k8s.io/apimachinery/pkg/util/version"

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
	// override functions must registered before AddToScheme
	kubelet.SchemeBuilder.Register(func(s *k8sruntime.Scheme) error {
		s.AddTypeDefaultingFunc(&kubelet.KubeletConfiguration{}, overrideKubeletDefaults)
		return nil
	})
	utilruntime.Must(kubeadmv1beta2.AddToScheme(scheme))
	utilruntime.Must(kubeadmv1beta3.AddToScheme(scheme))
	utilruntime.Must(kubeletconfig.AddToScheme(scheme))
	utilruntime.Must(proxyconfig.AddToScheme(scheme))
}

func overrideKubeletDefaults(obj interface{}) {
	kubeletconfig.SetObjectDefaults_KubeletConfiguration(obj.(*kubelet.KubeletConfiguration))
	logger.Debug("override defaults of kubelet configuration")
	obj.(*kubelet.KubeletConfiguration).ResolverConfig = nil
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

var defaultMergeOpts = []func(*mergo.Config){
	mergo.WithOverride,
	mergo.WithAppendSlice,
}

// LoadFromClusterfile :Load KubeadmConfig from Clusterfile.
// If it has `KubeadmConfig` in Clusterfile, load every field to each configuration.
// If Kubeadm raw Config in Clusterfile, just load it.
func (k *KubeadmConfig) LoadFromClusterfile(kubeadmConfig *KubeadmConfig) error {
	if kubeadmConfig == nil {
		return nil
	}
	return k.mutuallyExclusiveMerge(kubeadmConfig)
}

// mutuallyExclusiveMerge merge from kubeadmConfig, the mutually exclusive field will be droped.
func (k *KubeadmConfig) mutuallyExclusiveMerge(kubeadmConfig *KubeadmConfig) error {
	for _, fn := range []func(*KubeadmConfig){
		k.etcdLocalOrExternal,
	} {
		fn(kubeadmConfig)
	}
	return mergo.Merge(k, kubeadmConfig, defaultMergeOpts...)
}

func (k *KubeadmConfig) etcdLocalOrExternal(kubeadmConfig *KubeadmConfig) {
	if kubeadmConfig.Etcd.External != nil {
		k.Etcd.Local = nil
	} else if kubeadmConfig.Etcd.Local != nil {
		k.Etcd.External = nil
	}
}

// Merge Using github.com/imdario/mergo to merge KubeadmConfig to the CloudImage default kubeadm Config, overwrite some field.
// if defaultKubeadmConfig file not exist, use default raw kubeadm Config to merge k.KubeConfigSpec empty value
func (k *KubeadmConfig) Merge(kubeadmYamlPath string) error {
	var (
		defaultKubeadmConfig *KubeadmConfig
		err                  error
	)
	if kubeadmYamlPath == "" {
		defaultKubeadmConfig, err = LoadKubeadmConfigs(k.FetchDefaultKubeadmConfig(), false, DecodeCRDFromString)
		if err != nil {
			return err
		}
		return mergo.Merge(k, defaultKubeadmConfig, defaultMergeOpts...)
	} else if !file.IsExist(kubeadmYamlPath) {
		logger.Debug("skip merging kubeadm configs from cause file %s not exists", kubeadmYamlPath)
		return nil
	}
	logger.Debug("trying to merge kubeadm configs from file %s", kubeadmYamlPath)
	defaultKubeadmConfig, err = LoadKubeadmConfigs(kubeadmYamlPath, false, DecodeCRDFromFile)
	if err != nil {
		return fmt.Errorf("failed to load kubeadm config from %s: %v", kubeadmYamlPath, err)
	}
	err = mergo.Merge(k, defaultKubeadmConfig, defaultMergeOpts...)
	if err != nil {
		return fmt.Errorf("failed to merge kubeadm config from %s: %v", kubeadmYamlPath, err)
	}
	return nil
}

func LoadKubeadmConfigs(arg string, setDefaults bool, decode func(arg string, kind string) (interface{}, error)) (*KubeadmConfig, error) {
	if setDefaults {
		decode = func(arg string, kind string) (interface{}, error) {
			ret, err := decode(arg, kind)
			if err != nil {
				return nil, err
			}
			if obj, ok := ret.(k8sruntime.Object); ok {
				scheme.Default(obj)
			}
			return ret, nil
		}
	}
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
		return nil, err
	}
	defer file.Close()
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

func (k *KubeadmRuntime) setFeatureGatesConfiguration() {
	extraArgs := []map[string]string{k.ClusterConfiguration.ControllerManager.ExtraArgs, k.ClusterConfiguration.APIServer.ExtraArgs, k.ClusterConfiguration.Scheduler.ExtraArgs}
	if versionutil.MustParseSemantic(k.getKubeVersion()).LessThan(versionutil.MustParseSemantic("1.19.0")) {
		delete(extraArgs[0], "cluster-signing-duration")
		extraArgs[0]["experimental-cluster-signing-duration"] = "87600h"
	}
	for i, args := range extraArgs {
		if args["feature-gates"] != "" {
			args["feature-gates"] = UpdateFeatureGatesConfiguration(args["feature-gates"], k.getKubeVersion()).(string)
		}
		extraArgs[i] = args
	}

	k.KubeletConfiguration.FeatureGates = UpdateFeatureGatesConfiguration(k.KubeletConfiguration.FeatureGates, k.getKubeVersion()).(map[string]bool)
}
