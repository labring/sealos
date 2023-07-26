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

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// OperationrequestSpec defines the desired state of Operationrequest
type OperationrequestSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "make" to regenerate code after modifying this file
	Username  string `json:"username,omitempty"`
	Namespace string `json:"namespace,omitempty"`
	// +kubebuilder:validation:Enum=Owner;Manager;Developer
	Type string `json:"type,omitempty"`
	// +kubebuilder:validation:Enum=Grant;Update;Deprive
	Action ActionType `json:"action,omitempty"` //TODO action可能要加个 update 用于更新rolebinding
}
type ActionType string

const (
	Grant   ActionType = "Grant"
	Update  ActionType = "Update"
	Deprive ActionType = "Deprive"
)

const ExpirationTime string = "3m"

// OperationrequestStatus defines the observed state of Operationrequest
type OperationrequestStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file

	// Phase is the recently observed lifecycle phase of user
	//+kubebuilder:default:=Unknown
	Phase RequestPhase `json:"phase,omitempty"`
}

type RequestPhase string

// These are the valid phases of node.
const (
	RequestPending RequestPhase = "Pending"
	RequestUnknown RequestPhase = "Unknown"
	RequestActive  RequestPhase = "Active"
)

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// Operationrequest is the Schema for the operationrequests API
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
