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
	"k8s.io/apimachinery/pkg/runtime"
)

type ResourceType string

const (
	KubernetesTarGz  ResourceType = "kubernetes/tar.gz"
	KubernetesDir    ResourceType = "kubernetes/dir"
	ApplicationTarGz ResourceType = "application/tar.gz"
	ApplicationDir   ResourceType = "application/dir"
	FileBinaryAmd64  ResourceType = "file/binary/amd64"
	FileBinaryArm64  ResourceType = "file/binary/arm64"
	DefaultVersion                = "v0.0.0-master"
)

func (t ResourceType) IsDir() bool {
	return t == KubernetesDir || t == ApplicationDir

}
func (t ResourceType) IsBinary() bool {
	return t == FileBinaryAmd64 || t == FileBinaryArm64
}

func (t ResourceType) IsTarGz() bool {
	return t == ApplicationTarGz || t == KubernetesTarGz
}

// ResourceSpec defines the desired state of Resource
type ResourceSpec struct {
	Type     ResourceType `json:"type"`
	Path     string       `json:"path"`
	Override string       `json:"override,omitempty"`
}

// ResourceStatus defines the desired state of Resource
type ResourceStatus struct {
	Arch     Arch            `json:"arch"`
	Version  string          `json:"version"`
	Path     string          `json:"path"`
	Metadata runtime.Unknown `json:"metadata,omitempty"`
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
