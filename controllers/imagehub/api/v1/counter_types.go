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
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// CounterSpec defines the desired state of Counter
type CounterSpec struct {
	//+kubebuilder:Enum=repository-pull-counter;image-pull-counter;repository-rate-counter;image-rate-counter
	Type string `json:"type,omitempty"`

	// RefName is the name of the repository or image cr matename.
	RefName string `json:"refName,omitempty"`
}

// CounterStatus defines the observed state of Counter
type CounterStatus struct {
	Count int64 `json:"count,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// Counter is the Schema for the counters API
type Counter struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   CounterSpec   `json:"spec,omitempty"`
	Status CounterStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// CounterList contains a list of Counter
type CounterList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Counter `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Counter{}, &CounterList{})
}
