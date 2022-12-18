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

// action engine type
const (
	KubectlAction string = "kubectl"
)

// action status
const (
	Success    string = "SUCCESS"
	Processing string = "PROCESSING"
	Failed     string = "FAILED"
)

// ActionsSpec defines the desired state of Actions
type ActionsSpec struct {
	ActionName string            `json:"actionName,omitempty"`
	Args       map[string]string `json:"args,omitempty"`
	CMD        string            `json:"cmd,omitempty"`
}

type ActionsStatus struct {
	Status string `json:"status,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
type Actions struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ActionsSpec   `json:"spec,omitempty"`
	Status ActionsStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true
// ActionsList contains a list of Actions
type ActionsList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Actions `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Actions{}, &ActionsList{})
}
