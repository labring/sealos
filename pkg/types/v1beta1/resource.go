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

type ResourceType string

const (
	KubernetesTarGz  ResourceType = "kubernetes/tar.gz"
	ApplicationTarGz ResourceType = "application/tar.gz"
	KubernetesOCI    ResourceType = "kubernetes/oci"
	ApplicationOCI   ResourceType = "application/oci"
	DefaultVersion                = "v0.0.0-master"
)

func (t ResourceType) IsTarGz() bool {
	return t == ApplicationTarGz || t == KubernetesTarGz
}
func (t ResourceType) IsOCI() bool {
	return t == ApplicationOCI || t == KubernetesOCI
}

// ResourceSpec defines the desired state of Resource
type ResourceSpec struct {
	Type ResourceType `json:"type"`
	Path string       `json:"path"`
}

// ResourceStatus defines the desired state of Resource
type ResourceStatus struct {
	Arch    Arch              `json:"arch"`
	Version string            `json:"version"`
	Image   string            `json:"image"`
	Path    string            `json:"path"`
	Id      string            `json:"id"`
	Size    int64             `json:"size"`
	Data    map[string]string `json:"data,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// Resource is the Schema for the configs API
type Resource struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ResourceSpec   `json:"spec,omitempty"`
	Status ResourceStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true
// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// ResourceList contains a list of Resource
type ResourceList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Resource `json:"items"`
}
