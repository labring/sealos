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

// DeductionSpec defines the desired state of Deduction
type DeductionSpec struct {
}

// DeductionStatus defines the observed state of Deduction
type DeductionStatus struct {
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// Deduction is the Schema for the deductions API
type Deduction struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   DeductionSpec   `json:"spec,omitempty"`
	Status DeductionStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// DeductionList contains a list of Deduction
type DeductionList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Deduction `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Deduction{}, &DeductionList{})
}
