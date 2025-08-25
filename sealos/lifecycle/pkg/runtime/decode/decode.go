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
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	"k8s.io/apimachinery/pkg/util/yaml"
	proxy "k8s.io/kube-proxy/config/v1alpha1"
	kubelet "k8s.io/kubelet/config/v1beta1"
	kubeadmv1beta3 "k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm/v1beta3"
	kubeadmv1beta4 "k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm/v1beta4"
	kubeletconfig "k8s.io/kubernetes/pkg/kubelet/apis/config/v1beta1"
	proxyconfig "k8s.io/kubernetes/pkg/proxy/apis/config/v1alpha1"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
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

func overrideKubeletDefaults(obj interface{}) {
	kubeletconfig.SetObjectDefaults_KubeletConfiguration(obj.(*kubelet.KubeletConfiguration))
	logger.Debug("override defaults of kubelet configuration")
	obj.(*kubelet.KubeletConfiguration).ResolverConfig = nil
}

func CRDFromFile(filePath string, kind string) (interface{}, error) {
	file, err := os.Open(filepath.Clean(filePath))
	if err != nil {
		return nil, err
	}
	defer file.Close()
	return CRDFromReader(file, kind)
}

func CRDFromReader(r io.Reader, kind string) (interface{}, error) {
	d := yaml.NewYAMLOrJSONDecoder(r, 4096)

	for {
		ext := k8sruntime.RawExtension{}
		if err := d.Decode(&ext); err != nil {
			if err == io.EOF {
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
			return nil, fmt.Errorf("decode Cluster failed %v", err)
		}
		// ext.Raw
		if metaType.Kind == kind {
			return typeConversion(ext.Raw, metaType)
		}
	}
	return nil, nil
}

func CRDFromString(config string, kind string) (interface{}, error) {
	return CRDFromReader(strings.NewReader(config), kind)
}

func typeConversion(raw []byte, metaType *metav1.TypeMeta) (interface{}, error) {
	var obj k8sruntime.Object
	switch metaType.Kind {
	case Cluster:
		obj = &v2.Cluster{}
	case InitConfiguration:
		obj = &kubeadm.InitConfiguration{}
		if metaType.APIVersion == kubeadmv1beta3.SchemeGroupVersion.String() {
			newObj := &kubeadmv1beta3.InitConfiguration{}
			if err := yaml.Unmarshal(raw, newObj); err != nil {
				return nil, fmt.Errorf("decode kubeadmv1beta3 InitConfiguration failed %v", err)
			}
			// Convert to v1beta4
			if err := kubeadmv1beta3.Convert_v1beta3_InitConfiguration_To_kubeadm_InitConfiguration(newObj, obj.(*kubeadm.InitConfiguration), nil); err != nil {
				return nil, fmt.Errorf("convert kubeadmv1beta3 InitConfiguration to v1beta4 failed %v", err)
			}
			obj.(*kubeadm.InitConfiguration).APIVersion = kubeadmv1beta3.SchemeGroupVersion.String()
			obj.(*kubeadm.InitConfiguration).Kind = metaType.Kind
			return obj, nil
		}
	case JoinConfiguration:
		obj = &kubeadm.JoinConfiguration{}
		if metaType.APIVersion == kubeadmv1beta3.SchemeGroupVersion.String() {
			newObj := &kubeadmv1beta3.JoinConfiguration{}
			if err := yaml.Unmarshal(raw, newObj); err != nil {
				return nil, fmt.Errorf("decode kubeadmv1beta3 JoinConfiguration failed %v", err)
			}
			// Convert to v1beta4
			if err := kubeadmv1beta3.Convert_v1beta3_JoinConfiguration_To_kubeadm_JoinConfiguration(newObj, obj.(*kubeadm.JoinConfiguration), nil); err != nil {
				return nil, fmt.Errorf("convert kubeadmv1beta3 JoinConfiguration to v1beta4 failed %v", err)
			}
			obj.(*kubeadm.JoinConfiguration).APIVersion = kubeadmv1beta3.SchemeGroupVersion.String()
			obj.(*kubeadm.JoinConfiguration).Kind = metaType.Kind
			return obj, nil
		}
	case ClusterConfiguration:
		obj = &kubeadm.ClusterConfiguration{}
		if metaType.APIVersion == kubeadmv1beta3.SchemeGroupVersion.String() {
			newObj := &kubeadmv1beta3.ClusterConfiguration{}
			if err := yaml.Unmarshal(raw, newObj); err != nil {
				return nil, fmt.Errorf("decode kubeadmv1beta3 ClusterConfiguration failed %v", err)
			}
			// Convert to v1beta4
			if err := kubeadmv1beta3.Convert_v1beta3_ClusterConfiguration_To_kubeadm_ClusterConfiguration(newObj, obj.(*kubeadm.ClusterConfiguration), nil); err != nil {
				return nil, fmt.Errorf("convert kubeadmv1beta3 ClusterConfiguration to v1beta4 failed %v", err)
			}
			obj.(*kubeadm.ClusterConfiguration).APIVersion = kubeadmv1beta3.SchemeGroupVersion.String()
			obj.(*kubeadm.ClusterConfiguration).Kind = metaType.Kind
			return obj, nil
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
