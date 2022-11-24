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

// MeteringQuotaSpec defines the desired state of MeteringQuota
type MeteringQuotaSpec struct {
	Resources map[v1.ResourceName]ResourceUsed `json:"resources,omitempty"`
}

// MeteringQuotaStatus defines the observed state of MeteringQuota
type MeteringQuotaStatus struct {
}

type ResourceUsed struct {
	Used  *resource.Quantity `json:"used"`
	Owner string             `json:"owner"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// MeteringQuota is the Schema for the meteringquota API
type MeteringQuota struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   MeteringQuotaSpec   `json:"spec,omitempty"`
	Status MeteringQuotaStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// MeteringQuotaList contains a list of MeteringQuota
type MeteringQuotaList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []MeteringQuota `json:"items"`
}

func init() {
	SchemeBuilder.Register(&MeteringQuota{}, &MeteringQuotaList{})
}
