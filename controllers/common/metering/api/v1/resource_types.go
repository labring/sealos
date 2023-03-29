/*
Copyright 2022.

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
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type Status string

const (
	Complete Status = "complete"
	Create   Status = "create"
)

// ResourceSpec defines the desired state of Resource
type ResourceSpec struct {
	Resources map[v1.ResourceName]ResourceInfo `json:"resources,omitempty"`
}

type ResourceInfo struct {
	ResourceName string             `json:"resourceName,omitempty"`
	Used         *resource.Quantity `json:"used,omitempty"`
	Timestamp    int64              `json:"time,omitempty"`
	Namespace    string             `json:"namespace,omitempty"`
	Cost         int64              `json:"cost,omitempty"`
}

type ResourceInfoList []ResourceInfo

type ResourcePriceAndUsed struct {
	ResourcePrice `json:",inline"`
	Used          *resource.Quantity `json:"used,omitempty"`
}

// ResourceStatus defines the observed state of Resource
type ResourceStatus struct {
	Status Status `json:"status,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// Resource is the Schema for the resources API
type Resource struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ResourceSpec   `json:"spec,omitempty"`
	Status ResourceStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ResourceList contains a list of Resource
type ResourceList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Resource `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Resource{}, &ResourceList{})
}
