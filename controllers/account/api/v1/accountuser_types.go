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

// AccountUserSpec defines the desired state of AccountUser
type AccountUserSpec struct {
}

// AccountUserStatus defines the observed state of AccountUser
type AccountUserStatus struct {
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// AccountUser is the Schema for the accountusers API
type AccountUser struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AccountUserSpec   `json:"spec,omitempty"`
	Status AccountUserStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// AccountUserList contains a list of AccountUser
type AccountUserList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []AccountUser `json:"items"`
}

func init() {
	SchemeBuilder.Register(&AccountUser{}, &AccountUserList{})
}
