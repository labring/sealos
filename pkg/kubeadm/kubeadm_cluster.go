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

const clusterConfigDefault = `
apiVersion: kubeadm.k8s.io/{{.KubeadmAPIVersion}}
kind: ClusterConfiguration
kubernetesVersion: {{.KubeVersion}}
controlPlaneEndpoint: "{{.APIServerDomain}}:6443"
networking:
  podSubnet: {{.PodCIDR}}
  serviceSubnet: {{.SvcCIDR}}
apiServer:
  certSANs:
  - 127.0.0.1
  - {{.APIServerDomain}}
  {{range .MasterIPs -}}
  - {{.}}
  {{end -}}
  {{range .CertSANs -}}
  - {{.}}
  {{end -}}
  - {{.VIP}}
  extraArgs:
    feature-gates: TTLAfterFinished=true
	audit-policy-file: "/etc/kubernetes/audit-policy.yml"
    audit-log-path: "/var/log/kubernetes/audit.log"
    audit-log-format: json
    audit-log-maxbackup: '10'
    audit-log-maxsize: '100'
    audit-log-maxage: '7'
    enable-aggregator-routing: 'true'
  extraVolumes:
    - name: "audit"
      hostPath: "/etc/kubernetes"
      mountPath: "/etc/kubernetes"
      pathType: DirectoryOrCreate
    - name: "audit-log"
      hostPath: "/var/log/kubernetes"
      mountPath: "/var/log/kubernetes"
      pathType: DirectoryOrCreate
    - name: localtime
      hostPath: /etc/localtime
      mountPath: /etc/localtime
      readOnly: true
      pathType: File
controllerManager:
  extraArgs:
    feature-gates: TTLAfterFinished=true
    experimental-cluster-signing-duration: 876000h
  extraVolumes:
  - hostPath: /etc/localtime
    mountPath: /etc/localtime
    name: localtime
    readOnly: true
    pathType: File
scheduler:
  extraArgs:
    feature-gates: TTLAfterFinished=true
  extraVolumes:
  - hostPath: /etc/localtime
    mountPath: /etc/localtime
    name: localtime
    readOnly: true
    pathType: File`

func NewCluster(kubeAPI, master0, criSocket string) Kubeadm {
	return &cluster{
		KubeadmAPIVersion: getterKubeadmAPIVersion(kubeAPI),
		KubeVersion:       kubeAPI,
		APIServerDomain:   "",
		PodCIDR:           "",
		SvcCIDR:           "",
		VIP:               "",
		MasterIPs:         nil,
		CertSANs:          nil,
	}
}

type cluster struct {
	KubeadmAPIVersion string
	KubeVersion       string
	APIServerDomain   string
	PodCIDR           string
	SvcCIDR           string
	VIP               string
	MasterIPs         []string
	CertSANs          []string
}

func (c *cluster) DefaultConfig() (string, error) {
	return templateFromContent(clusterConfigDefault, c)
}

func (c *cluster) Kustomization(patch string) (string, error) {
	gvk := v1.GroupVersionKind{
		Group:   "kubeadm.k8s.io",
		Version: c.KubeadmAPIVersion,
		Kind:    "ClusterConfiguration",
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
