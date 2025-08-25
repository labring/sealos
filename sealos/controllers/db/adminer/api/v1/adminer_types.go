/*
Copyright 2023 labring.

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
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// +kubebuilder:validation:Enum=nginx
type IngressType string

const (
	Nginx IngressType = "nginx"
)

// AdminerSpec defines the desired state of Adminer
type AdminerSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "make" to regenerate code after modifying this file

	//+kubebuilder:validation:Required
	Connections []string `json:"connections"`
	//+kubebuilder:validation:Required
	Keepalived string `json:"keepalived"`
	//+kubebuilder:validation:Optional
	//+kubebuilder:default=nginx
	IngressType IngressType `json:"ingressType"`
}

// AdminerStatus defines the observed state of Adminer
type AdminerStatus struct {
	AvailableReplicas int32  `json:"availableReplicas"`
	Domain            string `json:"domain"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:printcolumn:name="Keepalived",type=string,JSONPath=".spec.keepalived"
//+kubebuilder:printcolumn:name="Available",type=string,JSONPath=".status.availableReplicas"
//+kubebuilder:printcolumn:name="Domain",type=string,JSONPath=".status.domain"
//+kubebuilder:printcolumn:name="Age",type="date",JSONPath=".metadata.creationTimestamp"

// Adminer is the Schema for the adminers API
type Adminer struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AdminerSpec   `json:"spec,omitempty"`
	Status AdminerStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// AdminerList contains a list of Adminer
type AdminerList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Adminer `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Adminer{}, &AdminerList{})
}
