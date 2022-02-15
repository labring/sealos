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

const initConfigDefault = `
apiVersion: kubeadm.k8s.io/{{.KubeadmAPIVersion}}
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: {{.Master0}}
  bindPort: 6443
nodeRegistration:
  criSocket: {{.CriSocket}}`

func NewInit(kubeAPI, master0, criSocket string) Kubeadm {
	return &initConfig{
		KubeadmAPIVersion: getterKubeadmAPIVersion(kubeAPI),
		Master0:           master0,
		CriSocket:         criSocket,
	}
}

type initConfig struct {
	KubeadmAPIVersion string
	Master0           string
	CriSocket         string
}

func (c *initConfig) DefaultConfig() (string, error) {
	return templateFromContent(initConfigDefault, c)
}

func (c *initConfig) Kustomization(patch string) (string, error) {
	gvk := v1.GroupVersionKind{
		Group:   "kubeadm.k8s.io",
		Version: c.KubeadmAPIVersion,
		Kind:    "InitConfiguration",
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
