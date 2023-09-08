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

// OperationrequestSpec defines the desired state of Operationrequest
type OperationrequestSpec struct {
	User string `json:"user,omitempty"`
	// +kubebuilder:validation:Enum=Owner;Manager;Developer
	Role RoleType `json:"role,omitempty"`
	// +kubebuilder:validation:Enum=Grant;Update;Deprive
	Action ActionType `json:"action,omitempty"`
}

type ActionType string

const (
	Grant   ActionType = "Grant"
	Update  ActionType = "Update"
	Deprive ActionType = "Deprive"
)

// OperationrequestStatus defines the observed state of Operationrequest
type OperationrequestStatus struct {
	// Phase is the recently observed lifecycle phase of operationrequest.
	//+kubebuilder:default:=Pending
	//+kubebuilder:validation:Enum=Pending;Processing;Completed;Failed
	Phase RequestPhase `json:"phase,omitempty"`
}

type RequestPhase string

// These are the valid phases of node.
const (
	RequestPending    RequestPhase = "Pending"
	RequestProcessing RequestPhase = "Processing"
	RequestCompleted  RequestPhase = "Completed"
	RequestFailed     RequestPhase = "Failed"
)

//+kubebuilder:printcolumn:name="Action",type="string",JSONPath=".spec.action"
//+kubebuilder:printcolumn:name="User",type="string",JSONPath=".spec.user"
//+kubebuilder:printcolumn:name="Role",type="string",JSONPath=".spec.role"
//+kubebuilder:printcolumn:name="Phase",type="string",JSONPath=".status.phase"
//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// Operationrequest is the Schema for the operation requests API
type Operationrequest struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   OperationrequestSpec   `json:"spec,omitempty"`
	Status OperationrequestStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// OperationrequestList contains a list of Operationrequest
type OperationrequestList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Operationrequest `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Operationrequest{}, &OperationrequestList{})
}
