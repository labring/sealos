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

// NamespaceBillingHistorySpec defines the desired state of NamespaceBillingHistory
type NamespaceBillingHistorySpec struct {
	StartTime metav1.Time `json:"startTime,omitempty"`
	EndTime   metav1.Time `json:"endTime,omitempty"`
	Type      Type        `json:"type"`
}

// NamespaceBillingHistoryStatus defines the observed state of NamespaceBillingHistory
type NamespaceBillingHistoryStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
	NamespaceList []string `json:"namespaceList,omitempty"`
	Status        Status   `json:"status,omitempty"`
	Detail        string   `json:"detail,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// NamespaceBillingHistory is the Schema for the namespacebillinghistories API
type NamespaceBillingHistory struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   NamespaceBillingHistorySpec   `json:"spec,omitempty"`
	Status NamespaceBillingHistoryStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// NamespaceBillingHistoryList contains a list of NamespaceBillingHistory
type NamespaceBillingHistoryList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []NamespaceBillingHistory `json:"items"`
}

func init() {
	SchemeBuilder.Register(&NamespaceBillingHistory{}, &NamespaceBillingHistoryList{})
}
