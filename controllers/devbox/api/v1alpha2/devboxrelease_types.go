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

// DevBoxReleaseSpec defines the desired state of Devboxrelease.
type DevBoxReleaseSpec struct {
	// +kubebuilder:validation:Required
	DevboxName string `json:"devboxName"`
	// +kubebuilder:validation:Required
	Version string `json:"version"`
	// +kubebuilder:validation:Optional
	Notes string `json:"notes,omitempty"`
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=false
	StartDevboxAfterRelease bool `json:"startDevboxAfterRelease,omitempty"`
}

type DevBoxReleasePhase string

const (
	// DevBoxReleasePhaseSuccess means the Devbox has been released
	DevBoxReleasePhaseSuccess DevBoxReleasePhase = "Success"
	// DevBoxReleasePhasePending means the Devbox has not been released
	DevBoxReleasePhasePending DevBoxReleasePhase = "Pending"
	// DevBoxReleasePhaseFailed means the Devbox has not been released
	DevBoxReleasePhaseFailed DevBoxReleasePhase = "Failed"
)

type DevBoxReleaseStatus struct {
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=Pending
	// +kubebuilder:validation:Enum=Success;Pending;Failed
	Phase               DevBoxReleasePhase `json:"phase,omitempty"`
	OriginalDevboxState DevboxState        `json:"originalDevboxState,omitempty"`
	SourceImage         string             `json:"sourceImage,omitempty"`
	TargetImage         string             `json:"targetImage,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:storageversion
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Phase",type="string",JSONPath=".status.phase"
// +kubebuilder:printcolumn:name="Version",type="string",JSONPath=".spec.version"
// +kubebuilder:printcolumn:name="SourceImage",type="string",JSONPath=".status.sourceImage"
// +kubebuilder:printcolumn:name="TargetImage",type="string",JSONPath=".status.targetImage"
// +kubebuilder:printcolumn:name="StartDevboxAfterRelease",type="boolean",JSONPath=".spec.startDevboxAfterRelease"

// DevBoxRelease is the Schema for the devboxreleases API.
type DevBoxRelease struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   DevBoxReleaseSpec   `json:"spec,omitempty"`
	Status DevBoxReleaseStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

// DevBoxReleaseList contains a list of DevBoxRelease.
type DevBoxReleaseList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []DevBoxRelease `json:"items"`
}

func init() {
	SchemeBuilder.Register(&DevBoxRelease{}, &DevBoxReleaseList{})
}
