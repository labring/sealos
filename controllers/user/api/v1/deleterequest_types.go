/*
Copyright 2022 labring.

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

// DeleteRequestSpec defines the desired state of DeleteRequest
type DeleteRequestSpec struct {
	User string `json:"user,omitempty"`
}

// DeleteRequestStatus defines the observed state of DeleteRequest
type DeleteRequestStatus struct {
	//+kubebuilder:validation:Enum=Pending;Processing;Completed;Failed
	Phase RequestPhase `json:"phase,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:resource:scope=Cluster
//+kubebuilder:printcolumn:name="User",type="string",JSONPath=".spec.user"
//+kubebuilder:printcolumn:name="Phase",type="string",JSONPath=".status.phase"

// DeleteRequest is the Schema for the deleterequests API
type DeleteRequest struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   DeleteRequestSpec   `json:"spec,omitempty"`
	Status DeleteRequestStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// DeleteRequestList contains a list of DeleteRequest
type DeleteRequestList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []DeleteRequest `json:"items"`
}

func init() {
	SchemeBuilder.Register(&DeleteRequest{}, &DeleteRequestList{})
}
