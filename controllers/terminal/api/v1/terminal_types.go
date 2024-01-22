/*
Copyright 2022 labring.

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

// TerminalSpec defines the desired state of Terminal
type TerminalSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "make" to regenerate code after modifying this file

	//+kubebuilder:validation:Required
	User string `json:"user"`
	//+kubebuilder:validation:Required
	Token string `json:"token"`
	//+kubebuilder:validation:Required
	TTYImage string `json:"ttyImage"`
	//+kubebuilder:validation:Required
	Replicas *int32 `json:"replicas"`
	//+kubebuilder:validation:Required
	Keepalived string `json:"keepalived"`
	//+kubebuilder:validation:Optional
	APIServer string `json:"apiServer"`
	//+kubebuilder:validation:Optional
	//+kubebuilder:default=nginx
	IngressType IngressType `json:"ingressType"`
}

// TerminalStatus defines the observed state of Terminal
type TerminalStatus struct {
	AvailableReplicas int32  `json:"availableReplicas"`
	ServiceName       string `json:"serviceName"`
	Domain            string `json:"domain"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:printcolumn:name="User",type=string,JSONPath=".spec.user"
//+kubebuilder:printcolumn:name="Keepalived",type=string,JSONPath=".spec.keepalived"
//+kubebuilder:printcolumn:name="Domain",type=string,JSONPath=".status.domain"
//+kubebuilder:printcolumn:name="APIServer",priority=1,type=string,JSONPath=".spec.apiServer"
//+kubebuilder:printcolumn:name="LastUpdateTime",priority=1,type=string,JSONPath=".metadata.annotations.lastUpdateTime"
//+kubebuilder:printcolumn:name="Age",type="date",JSONPath=".metadata.creationTimestamp"

// Terminal is the Schema for the terminals API
type Terminal struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   TerminalSpec   `json:"spec,omitempty"`
	Status TerminalStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// TerminalList contains a list of Terminal
type TerminalList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Terminal `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Terminal{}, &TerminalList{})
}
