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

// InitMeteringSpec defines the desired state of InitMetering
type InitMeteringSpec struct {
}

// InitMeteringStatus defines the observed state of InitMetering
type InitMeteringStatus struct {
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// InitMetering is the Schema for the initmeterings API
type InitMetering struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   InitMeteringSpec   `json:"spec,omitempty"`
	Status InitMeteringStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// InitMeteringList contains a list of InitMetering
type InitMeteringList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []InitMetering `json:"items"`
}

func init() {
	SchemeBuilder.Register(&InitMetering{}, &InitMeteringList{})
}
