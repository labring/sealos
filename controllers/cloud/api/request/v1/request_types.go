/*
Copyright 2023 yxxchange@163.com.

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

type RequestType string
type LicenseType string

const (
	License RequestType = "License"
	Record  RequestType = "Record"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// RequestSpec defines the desired state of Request
type RequestSpec struct {
	Type         RequestType `json:"type"`
	ApplyLicense string      `json:",inline"`
}

// RequestStatus defines the observed state of Request
type RequestStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// Request is the Schema for the requests API
// The Request struct is used to help users actively make requests to the cloud
type Request struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   RequestSpec   `json:"spec,omitempty"`
	Status RequestStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// RequestList contains a list of Request
type RequestList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Request `json:"items"`
}

type ApplyLicense struct {
	CUID        string `json:"c_uid,omitempty"`
	ApplyDate   int64  `json:"apply_date,omitempty"`
	ApplyPeriod int64  `json:"apply_period,omitempty"`
	Decription  string `json:"description,omitempty"`
}

func init() {
	SchemeBuilder.Register(&Request{}, &RequestList{})
}
