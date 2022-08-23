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

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:resource:scope=Cluster,shortName=ug
// +kubebuilder:printcolumn:name="Phase",type="string",JSONPath=".status.phase"
// +kubebuilder:printcolumn:name="Age",type="date",JSONPath=".metadata.creationTimestamp"

// UserGroup is the Schema for the usergroups API
type UserGroup struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`
	Status            UserGroupStatus `json:"status,omitempty"`
}

// UserGroupStatus defines the observed state of UserGroup
type UserGroupStatus struct {
	// Phase is the recently observed lifecycle phase of user group
	//+kubebuilder:default:=Unknown
	Phase UserPhase `json:"phase,omitempty"`
	// The generation observed by the user controller.
	// +optional
	ObservedGeneration int64 `json:"observedGeneration,omitempty"`
	// Conditions contains the different condition statuses for this user group.
	Conditions []Condition `json:"conditions,omitempty"`
}

//+kubebuilder:object:root=true

// UserGroupList contains a list of UserGroup
type UserGroupList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []UserGroup `json:"items"`
}

func init() {
	SchemeBuilder.Register(&UserGroup{}, &UserGroupList{})
}
