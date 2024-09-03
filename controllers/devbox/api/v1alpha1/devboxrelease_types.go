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

package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// DevBoxReleaseSpec defines the desired state of DevBoxRelease
type DevBoxReleaseSpec struct {
	// +kubebuilder:validation:Required
	DevboxName string `json:"devboxName"`
	// +kubebuilder:validation:Required
	NewTag string `json:"newTag"`
	// +kubebuilder:validation:Optional
	Notes string `json:"notes,omitempty"`
}

type DevboxReleasePhase string

const (
	// DevboxReleasePhaseSuccess means the Devbox has been tagged
	DevboxReleasePhaseSuccess DevboxReleasePhase = "Success"
	// DevboxReleasePhasePending means the Devbox has not been tagged
	DevboxReleasePhasePending DevboxReleasePhase = "Pending"
	// DevboxReleasePhaseFailed means the Devbox has not been tagged
	DevboxReleasePhaseFailed DevboxReleasePhase = "Failed"
)

type ImagePullStatus string

const (
	// ImagePullStatusUnknown means the image not know the image status
	ImagePullStatusUnknown ImagePullStatus = "Unknown"
	// ImagePullStatusPendingPush means the image push pending
	ImagePullStatusPendingPush ImagePullStatus = "PendingPush"
	// ImagePullStatusPendingRelease means the image push success
	ImagePullStatusPendingRelease ImagePullStatus = "PendingRelease"
	// ImagePullStatusSuccess means the image push success
	ImagePullStatusSuccess ImagePullStatus = "Success"
	// ImagePullStatusFailed means the image push failed
	ImagePullStatusFailed ImagePullStatus = "Failed"
)

type RestartDevboxStatus string

const (
	// RestartDevboxStatusUnknown means devbox not need to restart
	RestartDevboxStatusUnknown RestartDevboxStatus = "UnNeed"
	// RestartDevboxStatusRunning means devbox restart success
	RestartDevboxStatusRunning RestartDevboxStatus = "Running"
	// RestartDevboxStatusStopped means devbox restart not success
	RestartDevboxStatusStopped RestartDevboxStatus = "Stopped"
)

// DevBoxReleaseStatus defines the observed state of DevBoxRelease
type DevBoxReleaseStatus struct {
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=Pending
	Phase DevboxReleasePhase `json:"phase"`
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=Unknown
	ImagePullStatus     ImagePullStatus     `json:"imagePullStatus"`
	RestartDevboxStatus RestartDevboxStatus `json:"restartDevboxStatus"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status

// DevBoxRelease is the Schema for the devboxreleases API
type DevBoxRelease struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   DevBoxReleaseSpec   `json:"spec,omitempty"`
	Status DevBoxReleaseStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

// DevBoxReleaseList contains a list of DevBoxRelease
type DevBoxReleaseList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []DevBoxRelease `json:"items"`
}

func init() {
	SchemeBuilder.Register(&DevBoxRelease{}, &DevBoxReleaseList{})
}
