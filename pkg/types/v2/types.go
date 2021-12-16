// Copyright © 2021 Alibaba Group Holding Ltd.
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

package v2

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type SSH struct {
	User   string `json:"user,omitempty"`
	Passwd string `json:"passwd,omitempty"`
}

type Hosts struct {
	CPU        string   `json:"cpu,omitempty"`
	Memory     string   `json:"memory,omitempty"`
	Count      string   `json:"count,omitempty"`
	SystemDisk string   `json:"systemDisk,omitempty"`
	DataDisks  []string `json:"dataDisks,omitempty"`
	IPList     []string `json:"ipList,omitempty"`
}

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// InfraSpec defines the desired state of Infra
type InfraSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of Infra
	// Important: Run "make" to regenerate code after modifying this file

	// Foo is an example field of Infra. Edit types.go to remove/update
	Provider string   `json:"provider,omitempty"`
	SSH      SSH      `json:"ssh,omitempty"`
	CertSANS []string `json:"certSANS,omitempty"`
	Masters  Hosts    `json:"masters,omitempty"`
	Nodes    Hosts    `json:"nodes,omitempty"`
}

// InfraStatus defines the observed state of Infra
type InfraStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of Infra
	// Important: Run "make" to regenerate code after modifying this file
	// TODO save Infra status info

}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status

// Infra is the Schema for the Infras API
type Infra struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   InfraSpec   `json:"spec,omitempty"`
	Status InfraStatus `json:"status,omitempty"`
}

//func (Infra *Infra) GetEIP() string {
//	return Infra.Annotations[common.Eip]
//}
//
//func (Infra *Infra) GetMaster0IP() string {
//	return Infra.Annotations[common.Master0InternalIP]
//}
//
//func (Infra *Infra) GetEipID() string {
//	return Infra.Annotations[common.EipID]
//}
//
//func (Infra *Infra) GetMaster0ID() string {
//	return Infra.Annotations[common.Master0ID]
//}
//
//func (Infra *Infra) GetVpcID() string {
//	return Infra.Annotations[common.VpcID]
//}
//
//func (Infra *Infra) GetVSwitchID() string {
//	return Infra.Annotations[common.VSwitchID]
//}

func (in *Infra) GetAnnotationsByKey(key string) string {
	return in.Annotations[key]
}

func (in *Infra) SetAnnotations(key, value string) {
	if in.Annotations == nil {
		in.Annotations = make(map[string]string)
	}
	in.Annotations[key] = value
}

// +kubebuilder:object:root=true

// InfraList contains a list of Infra
type InfraList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Infra `json:"items"`
}
