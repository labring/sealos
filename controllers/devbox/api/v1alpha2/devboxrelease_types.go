/*
Copyright 2024.

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

package v1alpha2

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// DevboxreleaseSpec defines the desired state of Devboxrelease.
type DevboxreleaseSpec struct {
	// +kubebuilder:validation:Required
	DevboxName string `json:"devboxName"`
	// +kubebuilder:validation:Required
	Version string `json:"version"`
	// +kubebuilder:validation:Optional
	Notes string `json:"notes,omitempty"`
}

type DevboxReleasePhase string

const (
	// DevboxReleasePhaseSuccess means the Devbox has been released
	DevboxReleasePhaseSuccess DevboxReleasePhase = "Success"
	// DevboxReleasePhasePending means the Devbox has not been released
	DevboxReleasePhasePending DevboxReleasePhase = "Pending"
	// DevboxReleasePhaseFailed means the Devbox has not been released
	DevboxReleasePhaseFailed DevboxReleasePhase = "Failed"
)

type DevboxreleaseStatus struct {
	Phase               DevboxReleasePhase `json:"phase"`
	OriginalDevboxState DevboxState        `json:"originalDevboxState"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status

// Devboxrelease is the Schema for the devboxreleases API.
type Devboxrelease struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   DevboxreleaseSpec   `json:"spec,omitempty"`
	Status DevboxreleaseStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

// DevboxreleaseList contains a list of Devboxrelease.
type DevboxreleaseList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Devboxrelease `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Devboxrelease{}, &DevboxreleaseList{})
}
