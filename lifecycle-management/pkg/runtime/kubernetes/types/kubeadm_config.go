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

package types

import (
	"fmt"

	"github.com/imdario/mergo"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"
	versionutil "k8s.io/apimachinery/pkg/util/version"
	kubeproxyconfigv1alpha1 "k8s.io/kube-proxy/config/v1alpha1"
	kubeletconfigv1beta1 "k8s.io/kubelet/config/v1beta1"
	"k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm" // internal version
	"k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm/v1beta3"

	"github.com/labring/sealos/pkg/runtime/decode"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/maps"
)

//nolint:all
type KubeadmConfig struct {
	kubeadm.InitConfiguration
	kubeadm.ClusterConfiguration
	kubeadm.JoinConfiguration
	kubeproxyconfigv1alpha1.KubeProxyConfiguration
	kubeletconfigv1beta1.KubeletConfiguration
}

type ConvertedKubeadmConfig struct {
	InitConfiguration, ClusterConfiguration, JoinConfiguration, KubeProxyConfiguration, KubeletConfiguration interface{}
}

func NewKubeadmConfig() *KubeadmConfig {
	return &KubeadmConfig{}
}

func (k *KubeadmConfig) GetComponents() []any {
	converted, err := k.ToConvertedKubeadmConfig()
	if err != nil {
		logger.Error("failed to convert kubeadmConfig: %v", err)
		return nil
	}
	return []any{
		converted.InitConfiguration,
		converted.ClusterConfiguration,
		converted.JoinConfiguration,
		converted.KubeProxyConfiguration,
		converted.KubeletConfiguration,
	}
}

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

func (k *KubeadmConfig) FetchDefaultKubeadmConfig() string {
	logger.Debug("using default kubeadm config")
	return defaultKubeadmConfig
}

// Merge Using github.com/imdario/mergo to merge KubeadmConfig to the CloudImage default kubeadm Config, overwrite some field.
// if defaultKubeadmConfig file not exist, use default raw kubeadm Config to merge k.KubeConfigSpec empty value
func (k *KubeadmConfig) Merge(kubeadmYamlPath string) error {
	if kubeadmYamlPath == "" {
		defaultKubeadmConfig, err := LoadKubeadmConfigs(k.FetchDefaultKubeadmConfig(), false, decode.CRDFromString)
		if err != nil {
			return err
		}
		return mergo.Merge(k, defaultKubeadmConfig, defaultMergeOpts...)
	} else if !file.IsExist(kubeadmYamlPath) {
		logger.Debug("skip merging kubeadm configs from cause file %s not exists", kubeadmYamlPath)
		return nil
	}
	logger.Debug("trying to merge kubeadm configs from file %s", kubeadmYamlPath)
	kc, err := LoadKubeadmConfigs(kubeadmYamlPath, false, decode.CRDFromFile)
	if err != nil {
		return fmt.Errorf("failed to load kubeadm config from %s: %v", kubeadmYamlPath, err)
	}
	err = mergo.Merge(k, kc, defaultMergeOpts...)
	if err != nil {
		return fmt.Errorf("failed to merge kubeadm config from %s: %v", kubeadmYamlPath, err)
	}
	return nil
}

func (k *KubeadmConfig) ToConvertedKubeadmConfig() (*ConvertedKubeadmConfig, error) {
	conversion := &ConvertedKubeadmConfig{}
	var err error

	switch k.InitConfiguration.APIVersion {
	case KubeadmV1beta3, "": // defaults to v1beta3
		var v1beta3InitConfiguration v1beta3.InitConfiguration
		var v1beta3ClusterConfiguration v1beta3.ClusterConfiguration
		var v1beta3JoinConfiguration v1beta3.JoinConfiguration
		if err = v1beta3.Convert_kubeadm_InitConfiguration_To_v1beta3_InitConfiguration(&k.InitConfiguration, &v1beta3InitConfiguration, nil); err != nil {
			return nil, err
		}
		if err = v1beta3.Convert_kubeadm_ClusterConfiguration_To_v1beta3_ClusterConfiguration(&k.ClusterConfiguration, &v1beta3ClusterConfiguration, nil); err != nil {
			return nil, err
		}
		if err = v1beta3.Convert_kubeadm_JoinConfiguration_To_v1beta3_JoinConfiguration(&k.JoinConfiguration, &v1beta3JoinConfiguration, nil); err != nil {
			return nil, err
		}
		v1beta3InitConfiguration.APIVersion = v1beta3.SchemeGroupVersion.String()
		v1beta3ClusterConfiguration.APIVersion = v1beta3.SchemeGroupVersion.String()
		v1beta3JoinConfiguration.APIVersion = v1beta3.SchemeGroupVersion.String()
		v1beta3InitConfiguration.Kind = "InitConfiguration"
		v1beta3ClusterConfiguration.Kind = "ClusterConfiguration"
		v1beta3JoinConfiguration.Kind = "JoinConfiguration"
		conversion.InitConfiguration = v1beta3InitConfiguration
		conversion.ClusterConfiguration = v1beta3ClusterConfiguration
		conversion.JoinConfiguration = v1beta3JoinConfiguration
	default: // unknown version
		conversion.JoinConfiguration = k.JoinConfiguration
		conversion.InitConfiguration = k.InitConfiguration
		conversion.ClusterConfiguration = k.ClusterConfiguration
	}

	{
		v1beta1Kubelet := k.KubeletConfiguration.DeepCopy()
		v1alpha1KubeProxy := k.KubeProxyConfiguration.DeepCopy()
		v1beta1Kubelet.APIVersion = kubeletconfigv1beta1.SchemeGroupVersion.String()
		v1alpha1KubeProxy.APIVersion = kubeproxyconfigv1alpha1.SchemeGroupVersion.String()
		v1beta1Kubelet.Kind = "KubeletConfiguration"
		v1alpha1KubeProxy.Kind = "KubeProxyConfiguration"
		conversion.KubeProxyConfiguration = v1alpha1KubeProxy
		conversion.KubeletConfiguration = v1beta1Kubelet
	}

	return conversion, nil
}

func (k *KubeadmConfig) SetDefaults() {
	for _, obj := range []k8sruntime.Object{
		&k.ClusterConfiguration,
		&k.InitConfiguration,
		&k.JoinConfiguration,
		&k.KubeProxyConfiguration,
		&k.KubeletConfiguration,
	} {
		decode.Default(obj)
	}
}

func (k *KubeadmConfig) SetKubeVersion(version string) {
	k.ClusterConfiguration.KubernetesVersion = version
}

func (k *KubeadmConfig) SetAPIVersion(apiVersion string) {
	k.InitConfiguration.APIVersion = apiVersion
	k.ClusterConfiguration.APIVersion = apiVersion
	k.JoinConfiguration.APIVersion = apiVersion
}

func (k *KubeadmConfig) FinalizeFeatureGatesConfiguration() {
	if k.ClusterConfiguration.KubernetesVersion == "" {
		panic("kubernetesVersion must not been null")
	}
	extraArgs := []map[string]string{k.ClusterConfiguration.ControllerManager.ExtraArgs, k.ClusterConfiguration.APIServer.ExtraArgs, k.ClusterConfiguration.Scheduler.ExtraArgs}
	if versionutil.MustParseSemantic(k.ClusterConfiguration.KubernetesVersion).LessThan(versionutil.MustParseSemantic("1.19.0")) {
		delete(extraArgs[0], "cluster-signing-duration")
		extraArgs[0]["experimental-cluster-signing-duration"] = "87600h"
	}
	for i, args := range extraArgs {
		if args["feature-gates"] != "" {
			args["feature-gates"] = updateFeatureGatesConfiguration(args["feature-gates"], k.ClusterConfiguration.KubernetesVersion).(string)
		}
		extraArgs[i] = args
	}

	k.KubeletConfiguration.FeatureGates = updateFeatureGatesConfiguration(
		k.KubeletConfiguration.FeatureGates, k.ClusterConfiguration.KubernetesVersion).(map[string]bool)
}

// https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/
var featureGatesUpdate = map[string][]string{
	"CSIStorageCapacity":  {"LessThan", "v1.21.0"},
	"TTLAfterFinished":    {"AtLeast", "v1.24.0"},
	"EphemeralContainers": {"AtLeast", "v1.26.0"},
}

func deleteFeatureMap[T string | bool](currentFeature map[string]T, versionStr string) map[string]T {
	for k, v := range featureGatesUpdate {
		if v[0] == "LessThan" &&
			versionutil.MustParseSemantic(versionStr).LessThan(versionutil.MustParseSemantic(v[1])) {
			delete(currentFeature, k)
		}
		if v[0] == "AtLeast" &&
			versionutil.MustParseSemantic(versionStr).AtLeast(versionutil.MustParseSemantic(v[1])) {
			delete(currentFeature, k)
		}
	}
	return currentFeature
}

func updateFeatureGatesConfiguration(featureGates any, version string) any {
	switch x := featureGates.(type) {
	case string:
		currentFeature := maps.FromString(x, ",")
		currentFeature = deleteFeatureMap(currentFeature, version)
		return maps.ToString(currentFeature, ",")
	case map[string]bool:
		newFeature := x
		newFeature = deleteFeatureMap(newFeature, version)
		return newFeature
	}
	return nil
}

func LoadKubeadmConfigs(arg string, setDefaults bool, decodeFunc func(arg string, kind string) (interface{}, error)) (*KubeadmConfig, error) {
	if setDefaults {
		decodeFunc = func(arg string, kind string) (interface{}, error) {
			ret, err := decodeFunc(arg, kind)
			if err != nil {
				return nil, err
			}
			if obj, ok := ret.(k8sruntime.Object); ok {
				decode.Default(obj)
			}
			return ret, nil
		}
	}
	kubeadmConfig := &KubeadmConfig{}
	initConfig, err := decodeFunc(arg, decode.InitConfiguration)
	if err != nil {
		return nil, err
	} else if initConfig != nil {
		kubeadmConfig.InitConfiguration = *initConfig.(*kubeadm.InitConfiguration)
	}
	clusterConfig, err := decodeFunc(arg, decode.ClusterConfiguration)
	if err != nil {
		return nil, err
	} else if clusterConfig != nil {
		kubeadmConfig.ClusterConfiguration = *clusterConfig.(*kubeadm.ClusterConfiguration)
	}
	kubeProxyConfig, err := decodeFunc(arg, decode.KubeProxyConfiguration)
	if err != nil {
		return nil, err
	} else if kubeProxyConfig != nil {
		kubeadmConfig.KubeProxyConfiguration = *kubeProxyConfig.(*kubeproxyconfigv1alpha1.KubeProxyConfiguration)
	}
	kubeletConfig, err := decodeFunc(arg, decode.KubeletConfiguration)
	if err != nil {
		return nil, err
	} else if kubeletConfig != nil {
		kubeadmConfig.KubeletConfiguration = *kubeletConfig.(*kubeletconfigv1beta1.KubeletConfiguration)
	}
	joinConfig, err := decodeFunc(arg, decode.JoinConfiguration)
	if err != nil {
		return nil, err
	} else if joinConfig != nil {
		kubeadmConfig.JoinConfiguration = *joinConfig.(*kubeadm.JoinConfiguration)
	}
	return kubeadmConfig, nil
}
