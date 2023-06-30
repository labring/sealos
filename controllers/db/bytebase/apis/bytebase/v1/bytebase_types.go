/*
Copyright 2023.

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
	"github.com/labring/sealos/controllers/db/bytebase/client/api"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
)

// +kubebuilder:validation:Enum=nginx;
type IngressType string

const (
	Nginx IngressType = "nginx"
)

// BytebaseSpec defines the desired state of Bytebase
type BytebaseSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "make" to regenerate code after modifying this file
	// +kubebuilder:validation:Required
	Image string `json:"image"`
	// +kubebuilder:validation:Required
	Replicas *int32 `json:"replicas"`
	// +kubebuilder:validation:Required
	Keepalived string `json:"keepalived"`
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=nginx
	IngressType IngressType `json:"ingressType"`
	// +kubebuilder:validation:Required
	// +kubebuilder:default=8080
	Port intstr.IntOrString `json:"port"`
}

// BytebaseStatus defines the observed state of Bytebase
type BytebaseStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
	AvailableReplicas int32  `json:"availableReplicas"`
	Domain            string `json:"domain"`

	// +kubebuilder:validation:Optional
	LoginCookie api.LoginCookie `json:"loginCookie"`
	// +kubebuilder:validation:Optional
	RootPassword string `json:"rootPassword"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:JSONPath=".spec.keepalived",name="Keepalived",type=string
// +kubebuilder:printcolumn:JSONPath=".spec.ingressType",name="IngressType",type=string
// +kubebuilder:printcolumn:JSONPath=".status.availableReplicas",name="AvailableReplicas",type=string
// +kubebuilder:printcolumn:JSONPath=".status.domain",name="Domain",type=string
// +kubebuilder:printcolumn:name="Age",type="date",JSONPath=".metadata.creationTimestamp"

// Bytebase is the Schema for the bytebases API
type Bytebase struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   BytebaseSpec   `json:"spec,omitempty"`
	Status BytebaseStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

// BytebaseList contains a list of Bytebase
type BytebaseList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Bytebase `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Bytebase{}, &BytebaseList{})
}
