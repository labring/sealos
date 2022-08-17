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

// UserGroupSpec defines the desired state of UserGroup
type UserGroupSpec struct {
}

// UserGroupStatus defines the observed state of UserGroup
type UserGroupStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:printcolumn:name="Age",type="date",JSONPath=".metadata.creationTimestamp"

// UserGroup is the Schema for the usergroups API
type UserGroup struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`
	// RoleRef can only reference a ClusterRole in the global namespace.
	// If the RoleRef cannot be resolved, the Authorizer must return an error.
	RoleRef v1.RoleRef `json:"roleRef" protobuf:"bytes,3,opt,name=roleRef"`
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
