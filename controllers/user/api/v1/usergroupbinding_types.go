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
	v1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:resource:scope=Cluster,shortName=ugbinding
// +kubebuilder:printcolumn:name="UserGroup",type="string",JSONPath=".userGroupRef"
// +kubebuilder:printcolumn:name="Kind",type="string",JSONPath=".subject.kind"
// +kubebuilder:printcolumn:name="Phase",type="string",JSONPath=".status.phase"
// +kubebuilder:printcolumn:name="Age",type="date",JSONPath=".metadata.creationTimestamp"

// UserGroupBinding is the Schema for the usergroupbindings API
type UserGroupBinding struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Subject holds references to the objects the role applies to.
	// +optional
	Subject v1.Subject `json:"subject"`

	// RoleRef can only reference a ClusterRole in the global namespace.
	//+kubebuilder:default:=user
	RoleRef RoleRefType `json:"roleRef,omitempty"`
	// UserGroupRef is the reference to the user group that this binding binds to.
	UserGroupRef string `json:"userGroupRef"`
	// Status contains the different condition statuses for this user group.
	Status UserGroupBindingStatus `json:"status,omitempty"`
}

type RoleRefType string

const (
	RoleRefTypeManager RoleRefType = "manager"
	RoleRefTypeUser    RoleRefType = "user"
)

// UserGroupBindingStatus defines the observed state of UserGroupBinding
type UserGroupBindingStatus struct {
	// Phase is the recently observed lifecycle phase of user group binding
	//+kubebuilder:default:=Unknown
	Phase UserPhase `json:"phase,omitempty"`
	// The generation observed by the user controller.
	// +optional
	ObservedGeneration int64 `json:"observedGeneration,omitempty"`
	// Conditions contains the different condition statuses for this user group.
	Conditions []Condition `json:"conditions,omitempty"`
}

//+kubebuilder:object:root=true

// UserGroupBindingList contains a list of UserGroupBinding
type UserGroupBindingList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []UserGroupBinding `json:"items"`
}

func init() {
	SchemeBuilder.Register(&UserGroupBinding{}, &UserGroupBindingList{})
}
