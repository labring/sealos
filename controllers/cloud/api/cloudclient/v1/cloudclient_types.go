/*
Copyright 2023 yxxchange@163.com.

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

package v1

import (
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// CloudClientSpec defines the desired state of CloudClient
type CloudClientSpec struct {
	CloudURL  string `json:"URL"`
	CycleTime int    `json:"Cycle-Time,omitempty"`
	// +kubebuilder:validation:Optional
	Date string `json:"Date,omitempty"`
}

// CloudClientStatus defines the observed state of CloudClient
type CloudClientStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// CloudClient is the Schema for the cloudclients API
type CloudClient struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   CloudClientSpec   `json:"spec,omitempty"`
	Status CloudClientStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// CloudClientList contains a list of CloudClient
type CloudClientList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []CloudClient `json:"items"`
}

const layout = "2006-01-02"

func init() {
	SchemeBuilder.Register(&CloudClient{}, &CloudClientList{})
}

func NewStartInstance() CloudClient {
	res := CloudClient{}
	res.SetGroupVersionKind(schema.GroupVersionKind{Group: "cloud.sealos.io", Version: "v1", Kind: "StrategyInstance"})
	res.SetName("cloud-pull")
	res.SetNamespace("cloud-system")
	res.Spec.CycleTime = 60 * 60 * 8
	res.Spec.Date = time.Now().Format(layout)
	res.Spec.CloudURL = "https://hfx0m9.laf.dev/ReadDatabaseNTF"
	return res
}
