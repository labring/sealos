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
	FileBinary       ResourceType = "file/binary"
	DefaultVersion                = "v0.0.0-master"
)

func (t ResourceType) IsBinary() bool {
	return t == FileBinary
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
	Arch     Arch              `json:"arch"`
	Version  string            `json:"version"`
	Path     string            `json:"path"`
	RawPath  string            `json:"rawPath,omitempty"`
	Metadata map[string]string `json:"metadata,omitempty"`
	Data     map[string]string `json:"data,omitempty"`
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

func Rootfs(resources []Resource) *Resource {
	for _, r := range resources {
		if r.Status.RawPath != "" && r.Spec.Type == KubernetesTarGz {
			return &r
		}
	}
	return nil
}
