/*
Copyright 2024.

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

package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type RuntimeClassKind string

const (
	RuntimeClassOSKind        RuntimeClassKind = "OS"
	RuntimeClassLanguageKind  RuntimeClassKind = "Language"
	RuntimeClassFrameworkKind RuntimeClassKind = "Framework"
)

// RuntimeClassSpec defines the desired state of RuntimeClass
type RuntimeClassSpec struct {
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum=OS;Language;Framework
	Kind RuntimeClassKind `json:"kind"`
	// +kubebuilder:validation:Required
	Title string `json:"title"`
	// +kubebuilder:validation:Optional
	Description string `json:"description"`
}

// RuntimeClassStatus defines the observed state of RuntimeClass
type RuntimeClassStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:resource:scope=Cluster

// RuntimeClass is the Schema for the runtimeclasses API
type RuntimeClass struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   RuntimeClassSpec   `json:"spec,omitempty"`
	Status RuntimeClassStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

// RuntimeClassList contains a list of RuntimeClass
type RuntimeClassList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []RuntimeClass `json:"items"`
}

func init() {
	SchemeBuilder.Register(&RuntimeClass{}, &RuntimeClassList{})
}
