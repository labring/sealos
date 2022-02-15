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

import (
	"github.com/fanux/sealos/pkg/token"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const joinConfigDefault = `
apiVersion: kubeadm.k8s.io/{{.KubeadmAPIVersion}}
kind: JoinConfiguration
caCertPath: /etc/kubernetes/pki/ca.crt
discovery:
  bootstrapToken:
    {{- if .MasterIP}}
    apiServerEndpoint: {{.Master0}}:6443
    {{else}}
    apiServerEndpoint: {{.VIP}}:6443
    {{end -}}
    token: {{.JoinToken}}
	certificateKey: {{.CertificateKey}}
    caCertHashes:
    {{range .discoveryTokenCaCertHash -}}
    - {{.}}
    {{end -}}
  timeout: 5m0s
{{- if .MasterIP }}
controlPlane:
  localAPIEndpoint:
    advertiseAddress: {{.MasterIP}}
    bindPort: 6443
{{- end}}
nodeRegistration:
  criSocket: {{.CriSocket}}`

func NewJoinNode(kubeAPI, criSocket, vip string, token token.Token) Kubeadm {
	return &join{
		KubeadmAPIVersion: getterKubeadmAPIVersion(kubeAPI),
		VIP:               vip,
		CriSocket:         criSocket,
		Token:             token,
	}
}
func NewJoinMaster(kubeAPI, criSocket, master0, masterIP string, token token.Token) Kubeadm {
	return &join{
		KubeadmAPIVersion: getterKubeadmAPIVersion(kubeAPI),
		CriSocket:         criSocket,
		Token:             token,
		Master0:           master0,
		MasterIP:          masterIP,
	}
}

type join struct {
	KubeadmAPIVersion string
	Master0           string
	MasterIP          string
	CriSocket         string
	VIP               string
	token.Token
}

func (c *join) DefaultConfig() (string, error) {
	return templateFromContent(joinConfigDefault, c)
}

func (c *join) Kustomization(patch string) (string, error) {
	gvk := v1.GroupVersionKind{
		Group:   "kubeadm.k8s.io",
		Version: c.KubeadmAPIVersion,
		Kind:    "JoinConfiguration",
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
