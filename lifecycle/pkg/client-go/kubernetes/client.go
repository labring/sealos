// Copyright © 2021 sealos.
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

package kubernetes

import (
	"path/filepath"

	fileutil "github.com/labring/sealos/pkg/utils/file"

	"k8s.io/client-go/discovery"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
)

type Client interface {
	Kubernetes() kubernetes.Interface
	Discovery() discovery.DiscoveryInterface
	KubernetesDynamic() dynamic.Interface
	Config() *rest.Config
}

type kubernetesClient struct {
	// kubernetes client interface
	k8s        kubernetes.Interface
	k8sDynamic dynamic.Interface
	// discovery client
	discoveryClient *discovery.DiscoveryClient

	config *rest.Config
}

func newKubernetesClient(kubeconfig, apiserver string, insecure bool) (Client, error) {
	if kubeconfig == "" || !fileutil.IsExist(kubeconfig) {
		defaultKubeconfig := filepath.Join(homedir.HomeDir(), ".kube", "config")
		if !fileutil.IsExist(defaultKubeconfig) {
			kubeconfig = ""
		} else {
			kubeconfig = defaultKubeconfig
		}
	}
	config, err := clientcmd.BuildConfigFromFlags(apiserver, kubeconfig)
	if err != nil {
		return nil, err
	}
	config.QPS = 1e6
	config.Burst = 1e6
	if insecure {
		config.TLSClientConfig.CAFile = ""
		config.TLSClientConfig.CAData = nil
		config.TLSClientConfig.Insecure = true
	}

	var k kubernetesClient
	k8s, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}
	k.k8s = k8s

	discoveryClient, err := discovery.NewDiscoveryClientForConfig(config)
	if err != nil {
		return nil, err
	}
	k.discoveryClient = discoveryClient

	k8sDynamic, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, err
	}
	k.k8sDynamic = k8sDynamic

	k.config = config
	return &k, nil
}

func NewKubernetesClientSkipTLSVerify(kubeconfig, apiserver string) (Client, error) {
	return newKubernetesClient(kubeconfig, apiserver, true)
}

// NewKubernetesClient creates a KubernetesClient
func NewKubernetesClient(kubeconfig, apiserver string) (Client, error) {
	return newKubernetesClient(kubeconfig, apiserver, false)
}

func NewKubernetesClientByConfig(config *rest.Config) (Client, error) {
	config.QPS = 1e6
	config.Burst = 1e6
	var k kubernetesClient
	k8s, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}
	k.k8s = k8s

	discoveryClient, err := discovery.NewDiscoveryClientForConfig(config)
	if err != nil {
		return nil, err
	}
	k.discoveryClient = discoveryClient

	k8sDynamic, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, err
	}
	k.k8sDynamic = k8sDynamic

	k.config = config
	return &k, nil
}

func (k *kubernetesClient) Kubernetes() kubernetes.Interface {
	return k.k8s
}

func (k *kubernetesClient) Discovery() discovery.DiscoveryInterface {
	return k.discoveryClient
}

func (k *kubernetesClient) Config() *rest.Config {
	return k.config
}

func (k *kubernetesClient) KubernetesDynamic() dynamic.Interface {
	return k.k8sDynamic
}
