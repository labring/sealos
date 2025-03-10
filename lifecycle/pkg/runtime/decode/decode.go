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

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sruntime "k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	"k8s.io/apimachinery/pkg/util/yaml"
	proxy "k8s.io/kube-proxy/config/v1alpha1"
	kubelet "k8s.io/kubelet/config/v1beta1"
	"k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm"
	kubeadmv1beta3 "k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm/v1beta3"
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

func CRDFromString(config string, kind string) (interface{}, error) {
	return CRDFromReader(strings.NewReader(config), kind)
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

func Default(obj k8sruntime.Object) {
	scheme.Default(obj)
}
