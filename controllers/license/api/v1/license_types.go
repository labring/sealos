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
	"time"
)

type Type string

const (
	AccountLicenseType Type = "Account"
	ClusterLicenseType Type = "Cluster"
)

// LicenseSpec defines the desired state of License
type LicenseSpec struct {
	//+kubebuilder:validation:Enum=Account;Cluster
	Type  Type   `json:"type,omitempty"`
	Token string `json:"token,omitempty"`
}

type LicenseStatusPhase string

const (
	LicenseStatusPhasePending LicenseStatusPhase = "Pending"
	LicenseStatusPhaseFailed  LicenseStatusPhase = "Failed"
	LicenseStatusPhaseActive  LicenseStatusPhase = "Active"
)

// LicenseStatus defines the observed state of License
type LicenseStatus struct {
	//+kubebuilder:validation:Enum=Pending;Failed;Active
	//+kubebuilder:default=Pending
	Phase          LicenseStatusPhase `json:"phase,omitempty"`
	ActivationTime time.Time          `json:"activationTime,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// License is the Schema for the licenses API
type License struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   LicenseSpec   `json:"spec,omitempty"`
	Status LicenseStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// LicenseList contains a list of License
type LicenseList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []License `json:"items"`
}

func init() {
	SchemeBuilder.Register(&License{}, &LicenseList{})
}
