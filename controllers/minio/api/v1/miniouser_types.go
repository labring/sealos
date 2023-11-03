/*
Copyright 2023.

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

// MinioUserSpec defines the desired state of MinioUser
type MinioUserSpec struct {
}

// MinioUserStatus defines the observed state of MinioUser
type MinioUserStatus struct {
	// unit is byte
	Size         int64  `json:"size,omitempty"`
	Quota        int64  `json:"quota,omitempty"`
	ObjectsCount int64  `json:"objectsCount,omitempty"`
	AccessKey    string `json:"accessKey,omitempty"`
	SecretKey    string `json:"secretKey,omitempty"`
	Internal     string `json:"internal,omitempty"`
	External     string `json:"external,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// MinioUser is the Schema for the miniousers API
type MinioUser struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   MinioUserSpec   `json:"spec,omitempty"`
	Status MinioUserStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// MinioUserList contains a list of MinioUser
type MinioUserList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []MinioUser `json:"items"`
}

func init() {
	SchemeBuilder.Register(&MinioUser{}, &MinioUserList{})
}
