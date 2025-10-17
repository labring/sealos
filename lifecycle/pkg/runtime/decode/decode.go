// Copyright © 2023 sealos.
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

package decode

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	"k8s.io/apimachinery/pkg/util/yaml"
	proxy "k8s.io/kube-proxy/config/v1alpha1"
	kubelet "k8s.io/kubelet/config/v1beta1"
	"k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm"
	kubeadmv1beta3 "k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm/v1beta3"
	kubeadmv1beta4 "k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm/v1beta4"
	kubeletconfig "k8s.io/kubernetes/pkg/kubelet/apis/config/v1beta1"
	proxyconfig "k8s.io/kubernetes/pkg/proxy/apis/config/v1alpha1"
)

const (
	Cluster                = "Cluster"
	InitConfiguration      = "InitConfiguration"
	JoinConfiguration      = "JoinConfiguration"
	ClusterConfiguration   = "ClusterConfiguration"
	KubeProxyConfiguration = "KubeProxyConfiguration"
	KubeletConfiguration   = "KubeletConfiguration"
)

var scheme = k8sruntime.NewScheme()

func init() {
	// override functions must registered before AddToScheme
	kubelet.SchemeBuilder.Register(func(s *k8sruntime.Scheme) error {
		s.AddTypeDefaultingFunc(&kubelet.KubeletConfiguration{}, overrideKubeletDefaults)
		return nil
	})
	utilruntime.Must(kubeadmv1beta3.AddToScheme(scheme))
	utilruntime.Must(kubeadmv1beta4.AddToScheme(scheme))
	utilruntime.Must(kubeletconfig.AddToScheme(scheme))
	utilruntime.Must(proxyconfig.AddToScheme(scheme))
}

func overrideKubeletDefaults(obj any) {
	cfg, ok := obj.(*kubelet.KubeletConfiguration)
	if !ok {
		logger.Debug("unexpected type %T when overriding kubelet defaults", obj)
		return
	}
	kubeletconfig.SetObjectDefaults_KubeletConfiguration(cfg)
	logger.Debug("override defaults of kubelet configuration")
	cfg.ResolverConfig = nil
}

func CRDFromFile(filePath, kind string) (any, error) {
	file, err := os.Open(filepath.Clean(filePath))
	if err != nil {
		return nil, err
	}
	defer file.Close()
	return CRDFromReader(file, kind)
}

func CRDFromReader(r io.Reader, kind string) (any, error) {
	d := yaml.NewYAMLOrJSONDecoder(r, 4096)

	for {
		ext := k8sruntime.RawExtension{}
		if err := d.Decode(&ext); err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			return nil, err
		}

		ext.Raw = bytes.TrimSpace(ext.Raw)
		if len(ext.Raw) == 0 || bytes.Equal(ext.Raw, []byte("null")) {
			continue
		}
		metaType := &metav1.TypeMeta{}
		err := yaml.Unmarshal(ext.Raw, metaType)
		if err != nil {
			return nil, fmt.Errorf("decode Cluster failed %w", err)
		}
		// ext.Raw
		if metaType.Kind == kind {
			return typeConversion(ext.Raw, metaType)
		}
	}
	return nil, nil
}

func CRDFromString(config, kind string) (any, error) {
	return CRDFromReader(strings.NewReader(config), kind)
}

func typeConversion(raw []byte, metaType *metav1.TypeMeta) (any, error) {
	var obj k8sruntime.Object
	switch metaType.Kind {
	case Cluster:
		obj = &v2.Cluster{}
	case InitConfiguration:
		initCfg := &kubeadm.InitConfiguration{}
		obj = initCfg
		if metaType.APIVersion == kubeadmv1beta3.SchemeGroupVersion.String() {
			newObj := &kubeadmv1beta3.InitConfiguration{}
			if err := yaml.Unmarshal(raw, newObj); err != nil {
				return nil, fmt.Errorf("decode kubeadmv1beta3 InitConfiguration failed %w", err)
			}
			// Convert to v1beta4
			if err := kubeadmv1beta3.Convert_v1beta3_InitConfiguration_To_kubeadm_InitConfiguration(newObj, initCfg, nil); err != nil {
				return nil, fmt.Errorf(
					"convert kubeadmv1beta3 InitConfiguration to v1beta4 failed %w",
					err,
				)
			}
			initCfg.APIVersion = kubeadmv1beta3.SchemeGroupVersion.String()
			initCfg.Kind = metaType.Kind
			return initCfg, nil
		}
	case JoinConfiguration:
		joinCfg := &kubeadm.JoinConfiguration{}
		obj = joinCfg
		if metaType.APIVersion == kubeadmv1beta3.SchemeGroupVersion.String() {
			newObj := &kubeadmv1beta3.JoinConfiguration{}
			if err := yaml.Unmarshal(raw, newObj); err != nil {
				return nil, fmt.Errorf("decode kubeadmv1beta3 JoinConfiguration failed %w", err)
			}
			// Convert to v1beta4
			if err := kubeadmv1beta3.Convert_v1beta3_JoinConfiguration_To_kubeadm_JoinConfiguration(newObj, joinCfg, nil); err != nil {
				return nil, fmt.Errorf(
					"convert kubeadmv1beta3 JoinConfiguration to v1beta4 failed %w",
					err,
				)
			}
			joinCfg.APIVersion = kubeadmv1beta3.SchemeGroupVersion.String()
			joinCfg.Kind = metaType.Kind
			return joinCfg, nil
		}
	case ClusterConfiguration:
		clusterCfg := &kubeadm.ClusterConfiguration{}
		obj = clusterCfg
		if metaType.APIVersion == kubeadmv1beta3.SchemeGroupVersion.String() {
			newObj := &kubeadmv1beta3.ClusterConfiguration{}
			if err := yaml.Unmarshal(raw, newObj); err != nil {
				return nil, fmt.Errorf("decode kubeadmv1beta3 ClusterConfiguration failed %w", err)
			}
			// Convert to v1beta4
			if err := kubeadmv1beta3.Convert_v1beta3_ClusterConfiguration_To_kubeadm_ClusterConfiguration(newObj, clusterCfg, nil); err != nil {
				return nil, fmt.Errorf(
					"convert kubeadmv1beta3 ClusterConfiguration to v1beta4 failed %w",
					err,
				)
			}
			clusterCfg.APIVersion = kubeadmv1beta3.SchemeGroupVersion.String()
			clusterCfg.Kind = metaType.Kind
			return clusterCfg, nil
		}
	case KubeletConfiguration:
		obj = &kubelet.KubeletConfiguration{}
	case KubeProxyConfiguration:
		obj = &proxy.KubeProxyConfiguration{}
	default:
		return nil, fmt.Errorf("not found type %s from %s", metaType.Kind, string(raw))
	}
	if err := yaml.Unmarshal(raw, obj); err != nil {
		return nil, err
	}
	return obj, nil
}

func Default(obj k8sruntime.Object) {
	scheme.Default(obj)
}
