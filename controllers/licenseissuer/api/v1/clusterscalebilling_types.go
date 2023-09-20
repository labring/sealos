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

// ClusterScaleBillingSpec defines the desired state of ClusterScaleBilling
type ClusterScaleBillingSpec struct {
}

// ClusterScaleBillingStatus defines the observed state of ClusterScaleBilling
type ClusterScaleBillingStatus struct {
	EncryptQuota string `json:"encryptQuota"`
	Quota        int64  `json:"quota"`
	Used         int64  `json:"used"`
	EncryptUsed  string `json:"encryptUsed"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// ClusterScaleBilling is the Schema for the clusterscalebillings API
type ClusterScaleBilling struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ClusterScaleBillingSpec   `json:"spec,omitempty"`
	Status ClusterScaleBillingStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ClusterScaleBillingList contains a list of ClusterScaleBilling
type ClusterScaleBillingList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ClusterScaleBilling `json:"items"`
}

func init() {
	SchemeBuilder.Register(&ClusterScaleBilling{}, &ClusterScaleBillingList{})
}
