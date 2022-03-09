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

// +kubebuilder:object:root=true
// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// Cluster is the Schema for the Metadata API
type Cluster struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec ClusterSpec `json:"spec,omitempty"`
}

type ClusterSSH struct {
	User     string `json:"user,omitempty"`
	Passwd   string `json:"passwd,omitempty"`
	Pk       string `json:"pk,omitempty"`
	PkPasswd string `json:"pkPasswd,omitempty"`
	Port     int32  `json:"port,omitempty"`
}

type ClusterHost struct {
	IPS   []string `json:"ips,omitempty"`
	Roles []string `json:"roles,omitempty"`
	//overwrite env
	Env []string `json:"env,omitempty"`
}

// ClusterSpec defines the desired state of Metadata
type ClusterSpec struct {
	SSH   ClusterSSH    `json:"ssh"`
	Hosts []ClusterHost `json:"hosts,omitempty"`
	// Why env not using map[string]string
	// Because some argument is list, like: CertSANS=127.0.0.1 CertSANS=localhost, if ENV is map, will merge those two values
	// but user want to Metadata a list, using array we can convert it to {CertSANS:[127.0.0.1, localhost]}
	Env     []string `json:"env,omitempty"`
	CMDArgs []string `json:"cmd_args,omitempty"`
}

