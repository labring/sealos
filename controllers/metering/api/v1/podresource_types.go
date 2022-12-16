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
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// PodResourceSpec defines the desired state of PodResource
type PodResourceSpec struct {
	ResourceName string                            `json:"resourceName,omitempty"`
	Resources    map[v1.ResourceName]ResourcePrice `json:"resources,omitempty"`

	// update used resources every Interval minutes
	//+kubebuilder:default=50
	//+kubebuilder:validation:Minimum=1
	Interval int `json:"interval,omitempty"`
}

// PodResourceStatus defines the observed state of PodResource
type PodResourceStatus struct {
	LatestUpdateTime int64 `json:"latestUpdateTime,omitempty"`
	SeqID            int64 `json:"seqID,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// PodResource is the Schema for the podresources API
type PodResource struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   PodResourceSpec   `json:"spec,omitempty"`
	Status PodResourceStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// PodResourceList contains a list of PodResource
type PodResourceList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []PodResource `json:"items"`
}

func init() {
	SchemeBuilder.Register(&PodResource{}, &PodResourceList{})
}
