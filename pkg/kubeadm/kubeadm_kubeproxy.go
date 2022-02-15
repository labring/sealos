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

package kubeadm

import v1 "k8s.io/apimachinery/pkg/apis/meta/v1"

const kubeproxyConfigDefault = `
apiVersion: kubeproxy.config.k8s.io/v1alpha1
kind: KubeProxyConfiguration
mode: "ipvs"
ipvs:
  excludeCIDRs:
  - "{{.VIP}}/32"`

func NewKubeproxy(vip string) Kubeadm {
	return &kubeproxy{VIP: vip}
}

type kubeproxy struct {
	VIP string
}

func (c *kubeproxy) DefaultConfig() (string, error) {
	return templateFromContent(kubeproxyConfigDefault, c)
}

func (c *kubeproxy) Kustomization(patch string) (string, error) {
	gvk := v1.GroupVersionKind{
		Group:   "kubeproxy.config.k8s.io",
		Version: "v1alpha1",
		Kind:    "KubeProxyConfiguration",
	}
	kf, err := getterKFile(gvk, patch != "")
	if err != nil {
		return "", err
	}
	config, err := c.DefaultConfig()
	if err != nil {
		return "", err
	}
	return kustomization(kf, config, patch, false)
}
