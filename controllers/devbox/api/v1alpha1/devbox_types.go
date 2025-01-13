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
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	// FinalizerName is the finalizer for Devbox
	FinalizerName = "devbox.sealos.io/finalizer"
	DevBoxPartOf  = "devbox"
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

type RuntimeRef struct {
	// +kubebuilder:validation:Required
	Name string `json:"name"`
	// +kubebuilder:validation:Optional
	Namespace string `json:"namespace,omitempty"`
}

type NetworkSpec struct {
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum=NodePort;Tailnet
	Type NetworkType `json:"type"`
	// +kubebuilder:validation:Optional
	ExtraPorts []corev1.ContainerPort `json:"extraPorts"`
}

type Config struct {
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=devbox
	User string `json:"user"`

	// +kubebuilder:validation:Optional
	Labels map[string]string `json:"labels,omitempty"`
	// +kubebuilder:validation:Optional
	Annotations map[string]string `json:"annotations,omitempty"`

	// +kubebuilder:validation:Optional
	Command []string `json:"command,omitempty"`
	// kubebuilder:validation:Optional
	Args []string `json:"args,omitempty"`
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=/home/devbox/project
	WorkingDir string `json:"workingDir,omitempty"`
	// +kubebuilder:validation:Optional
	Env []corev1.EnvVar `json:"env,omitempty"`

	// +kubebuilder:validation:Optional
	// +kubebuilder:default={/bin/bash,-c}
	ReleaseCommand []string `json:"releaseCommand,omitempty"`
	// +kubebuilder:validation:Optional
	// +kubebuilder:default={/home/devbox/project/entrypoint.sh}
	ReleaseArgs []string `json:"releaseArgs,omitempty"`

	// TODO: in v1alpha2 api we need fix the port and app port into one field and create a new type for it.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default={{name:"devbox-ssh-port",containerPort:22,protocol:TCP}}
	Ports []corev1.ContainerPort `json:"ports,omitempty"`
	// +kubebuilder:validation:Optional
	// +kubebuilder:default={{name:"devbox-app-port",port:8080,protocol:TCP}}
	AppPorts []corev1.ServicePort `json:"appPorts,omitempty"`

	// +kubebuilder:validation:Optional
	VolumeMounts []corev1.VolumeMount `json:"volumeMounts,omitempty"`
	// +kubebuilder:validation:Optional
	Volumes []corev1.Volume `json:"volumes,omitempty"`
}

// DevboxSpec defines the desired state of Devbox
type DevboxSpec struct {
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum=Running;Stopped
	State DevboxState `json:"state"`
	// +kubebuilder:validation:Required
	Resource corev1.ResourceList `json:"resource"`

	// +kubebuilder:validation:Optional
	// +kubebuilder:default=false
	Squash bool `json:"squash"`

	// +kubebuilder:validation:Required
	Image string `json:"image"`

	// +kubebuilder:validation:Optional
	TemplateID string `json:"templateID"`

	// +kubebuilder:validation:Required
	Config Config `json:"config"`

	// +kubebuilder:validation:Required
	NetworkSpec NetworkSpec `json:"network,omitempty"`

	// +kubebuilder:validation:Optional
	RuntimeClassName string `json:"runtimeClassName,omitempty"`
	// +kubebuilder:validation:Optional
	NodeSelector map[string]string `json:"nodeSelector,omitempty"`
	// +kubebuilder:validation:Optional
	Tolerations []corev1.Toleration `json:"tolerations,omitempty"`
	// +kubebuilder:validation:Optional
	Affinity *corev1.Affinity `json:"affinity,omitempty"`
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
	// Image is the image of the commit
	Image string `json:"image"`
	// Time is the time when the commit is created
	Time metav1.Time `json:"time"`
	// Pod is the pod name
	Pod string `json:"pod"`
	// status will be set based on expectedStatus after devbox pod delete or stop. if expectedStatus is still pending, it means the pod is not running successfully, so we need to set it to `failed`
	Status CommitStatus `json:"status"`
	// predicatedStatus default `pending`, will be set to `success` if pod status is running successfully.
	PredicatedStatus CommitStatus `json:"predicatedStatus"`
	// Node is the node name
	Node string `json:"node"`
	// ContainerID is the container id
	ContainerID string `json:"containerID"`
}

type DevboxPhase string

const (
	// DevboxPhaseRunning means Devbox is run and run success
	DevboxPhaseRunning DevboxPhase = "Running"
	// DevboxPhasePending means Devbox is run but not run success
	DevboxPhasePending DevboxPhase = "Pending"
	//DevboxPhaseStopped means Devbox is stop and stopped success
	DevboxPhaseStopped DevboxPhase = "Stopped"
	//DevboxPhaseStopping means Devbox is stopping
	DevboxPhaseStopping DevboxPhase = "Stopping"
	//DevboxPhaseError means Devbox is error
	DevboxPhaseError DevboxPhase = "Error"
	//DevboxPhaseUnknown means Devbox is unknown
	DevboxPhaseUnknown DevboxPhase = "Unknown"
)

// DevboxStatus defines the observed state of Devbox
type DevboxStatus struct {
	// +kubebuilder:validation:Optional
	Network NetworkStatus `json:"network"`
	// +kubebuilder:validation:Optional
	CommitHistory []*CommitHistory `json:"commitHistory"`
	// +kubebuilder:validation:Optional
	Phase DevboxPhase `json:"phase"`

	// +kubebuilder:validation:Optional
	State corev1.ContainerState `json:"state"`
	// +kubebuilder:validation:Optional
	LastTerminationState corev1.ContainerState `json:"lastState"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="State",type="string",JSONPath=".spec.state"
// +kubebuilder:printcolumn:name="NetworkType",type="string",JSONPath=".status.network.type"
// +kubebuilder:printcolumn:name="NodePort",type="integer",JSONPath=".status.network.nodePort"
// +kubebuilder:printcolumn:name="Phase",type="string",JSONPath=".status.phase"

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
