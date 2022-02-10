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

package v1beta1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type ConfigSSH struct {
	User     string `json:"user,omitempty"`
	Passwd   string `json:"passwd,omitempty"`
	Pk       string `json:"pk,omitempty"`
	PkPasswd string `json:"pkPasswd,omitempty"`
	Port     string `json:"port,omitempty"`
}

type ConfigHost struct {
	IPS   []string  `json:"ips,omitempty"`
	Roles []string  `json:"roles,omitempty"`
}

type ConfigCNI struct {
	Type    string            `json:"type"`
	Version string            `json:"version"`
	Data    map[string]string `json:"data"`
}

type ConfigRegistry struct {
	Domain    string  `json:"domain"`
	Port      string  `json:"port"`
	Username  string  `json:"username"`
	Password  string  `json:"password"`
	ConfigDir string  `json:"config_dir"` // /etc/registry
	DataDir   string  `json:"data_dir"`   // /var/lib/registry
	Host      *string `json:"host,omitempty"`
}

type ConfigCRI struct {
	Registry ConfigRegistry `json:"registry"`
	DataDir  string         `json:"data_dir"`
}

type ConfigMetadata struct {
	Version string `json:"version"`
	Arch    string `json:"arch"`
}

type ConfigNetwork struct {
	DNSDomain         string   `json:"dnsdomain"`
	APIServerCertSANs []string `json:"apiservercertsans"`
	VIP               string   `json:"vip"`
	SvcCIDR           string   `json:"svccidr"`
}

type ConfigFilesystem struct {
	CertPath        string `json:"cert"`
	CertEtcdPath    string `json:"etcd"`
	KubeadmInitPath string `json:"init"`
	KubeadmJoinPath string `json:"join"`
}

type ConfigJoinNode struct {
	Token   string       `json:"token"`
	Expires *metav1.Time `json:"expires,omitempty"`
}

type ConfigJoinMaster struct {
	DiscoveryTokenCaCertHash string `json:"discovery-token-ca-cert-hash"`
	CertificateKey           string `json:"certificate-key"`
}

type ConfigToken struct {
	JoinNode   ConfigJoinNode   `json:"join_node"`
	JoinMaster ConfigJoinMaster `json:"join_master"`
}

type ConfigSystem struct {
	CNI          ConfigCNI      `json:"cni"`
	LvscareImage string         `json:"lvscareimage"`
	CRI          ConfigCRI      `json:"cri"`
	Metadata     ConfigMetadata `json:"metadata"`
}

// +kubebuilder:object:root=true
// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// Config is the Schema for the Config API
type Config struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec ConfigSpec `json:"spec,omitempty"`
}

// ConfigSpec defines the desired state of Config
type ConfigSpec struct {
	SSH    ConfigSSH    `json:"ssh"`
	System ConfigSystem `json:"system"`
	Hosts  []ConfigHost `json:"hosts,omitempty"`
}
