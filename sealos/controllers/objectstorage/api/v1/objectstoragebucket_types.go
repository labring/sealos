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

// ObjectStorageBucketSpec defines the desired state of ObjectStorageBucket
type ObjectStorageBucketSpec struct {
	//+kubebuilder:default=private
	//+kubebuilder:validation:Enum=private;publicRead;publicReadwrite
	Policy string `json:"policy,omitempty"`
}

// ObjectStorageBucketStatus defines the observed state of ObjectStorageBucket
type ObjectStorageBucketStatus struct {
	Name string `json:"name,omitempty"`
	Size int64  `json:"size,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// ObjectStorageBucket is the Schema for the objectstoragebuckets API
type ObjectStorageBucket struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ObjectStorageBucketSpec   `json:"spec,omitempty"`
	Status ObjectStorageBucketStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ObjectStorageBucketList contains a list of ObjectStorageBucket
type ObjectStorageBucketList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ObjectStorageBucket `json:"items"`
}

func init() {
	SchemeBuilder.Register(&ObjectStorageBucket{}, &ObjectStorageBucketList{})
}
