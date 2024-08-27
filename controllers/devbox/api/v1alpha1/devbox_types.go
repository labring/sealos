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
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type ResourceName string

const (
	// ResourceCPU CPU, in cores. (500m = .5 cores)
	ResourceCPU ResourceName = "cpu"
	// ResourceMemory Memory, in bytes. (500Gi = 500GiB = 500 * 1024 * 1024 * 1024)
	ResourceMemory ResourceName = "memory"
)

type DevboxState string

const (
	// DevboxStateRunning means the Devbox is running
	DevboxStateRunning DevboxState = "Running"
	// DevboxStatePending means the Devbox is pending
	DevboxStatePending DevboxState = "Pending"
	// DevboxStateStopped means the Devbox is stopped
	DevboxStateStopped DevboxState = "Stopped"
)

type NetworkType string

const (
	NetworkTypeNodePort NetworkType = "NodePort"
	NetworkTypeTailnet  NetworkType = "Tailnet"
)

type ResourceList map[ResourceName]resource.Quantity

type RuntimeRef struct {
	// +kubebuilder:validation:Required
	Name string `json:"name"`
}

type NetworkSpec struct {
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum=NodePort;Tailnet
	Type NetworkType `json:"type"`
	// +kubebuilder:validation:Optional
	ExtraPorts []corev1.ContainerPort `json:"extraPorts"`
}

// DevboxSpec defines the desired state of Devbox
type DevboxSpec struct {
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum=Running;Stopped
	State DevboxState `json:"state"`
	// +kubebuilder:validation:Required
	Resource ResourceList `json:"resource"`
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=false
	Squash bool `json:"squash"`
	// +kubebuilder:validation:Required
	RuntimeRef RuntimeRef `json:"runtimeRef"`
	// +kubebuilder:validation:Required
	NetworkSpec NetworkSpec `json:"network"`
}

type NetworkStatus struct {
	// +kubebuilder:default=NodePort
	// +kubebuilder:validation:Enum=NodePort;Tailnet
	Type NetworkType `json:"type"`

	// +kubebuilder:validation:Optional
	NodePort int32 `json:"nodePort"`

	// todo TailNet
	// +kubebuilder:validation:Optional
	TailNet string `json:"tailnet"`
}

type CommitStatus string

const (
	CommitStatusSuccess CommitStatus = "Success"
	CommitStatusFailed  CommitStatus = "Failed"
	CommitStatusUnknown CommitStatus = "Unknown"
	CommitStatusPending CommitStatus = "Pending"
)

type CommitHistory struct {
	Image  string       `json:"image"`
	Time   metav1.Time  `json:"time"`
	Pod    string       `json:"pod"`
	Status CommitStatus `json:"status"`
}

// DevboxStatus defines the observed state of Devbox
type DevboxStatus struct {
	// +kubebuilder:validation:Optional
	DevboxPodPhase corev1.PodPhase `json:"podPhase"`
	// +kubebuilder:validation:Optional
	Network NetworkStatus `json:"network"`
	// +kubebuilder:validation:Optional
	CommitHistory []*CommitHistory `json:"commitHistory"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status

// Devbox is the Schema for the devboxes API
type Devbox struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   DevboxSpec   `json:"spec,omitempty"`
	Status DevboxStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

// DevboxList contains a list of Devbox
type DevboxList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Devbox `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Devbox{}, &DevboxList{})
}
