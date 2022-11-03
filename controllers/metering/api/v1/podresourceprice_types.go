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

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// PodResourcePriceSpec defines the desired state of PodResourcePrice
type PodResourcePriceSpec struct {
	Owner     string                            `json:"owner,omitempty"`
	Resources map[v1.ResourceName]ResourcePrice `json:"resources,omitempty"`
	// update used resources every Interval minutes
	Interval int `json:"interval,omitempty"`
}

// PodResourcePriceStatus defines the observed state of PodResourcePrice
type PodResourcePriceStatus struct {
	LatestUpdateTime int64 `json:"latestUpdateTime,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// PodResourcePrice is the Schema for the  PodResourcePrice API
type PodResourcePrice struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   PodResourcePriceSpec   `json:"spec,omitempty"`
	Status PodResourcePriceStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// PodResourcePriceList contains a list of PodResourcePrice
type PodResourcePriceList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []PodResourcePrice `json:"items"`
}

func init() {
	SchemeBuilder.Register(&PodResourcePrice{}, &PodResourcePriceList{})
}
