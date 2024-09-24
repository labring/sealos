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

type Config struct {
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=sealos
	User string `json:"user"`

	// +kubebuilder:validation:Required
	Image string `json:"image"`

	// +kubebuilder:validation:Optional
	Labels map[string]string `json:"labels,omitempty"`
	// +kubebuilder:validation:Optional
	Annotations map[string]string `json:"annotations,omitempty"`

	// +kubebuilder:validation:Optional
	Command []string `json:"command,omitempty"`
	// kubebuilder:validation:Optional
	Args []string `json:"args,omitempty"`
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=/home/sealos/project
	WorkingDir string `json:"workingDir,omitempty"`
	// +kubebuilder:validation:Optional
	Env []corev1.EnvVar `json:"env,omitempty"`

	// +kubebuilder:validation:Optional
	// +kubebuilder:default={/bin/bash,-c}
	ReleaseCommand []string `json:"releaseCommand,omitempty"`
	// +kubebuilder:validation:Optional
	// +kubebuilder:default={/home/sealos/project/entrypoint.sh}
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

type Component struct {
	// +kubebuilder:validation:Required
	Name string `json:"name"`
	// +kubebuilder:validation:Required
	Version string `json:"version"`
}

// RuntimeSpec defines the desired state of Runtime
type RuntimeSpec struct {
	// +kubebuilder:validation:Required
	Version string `json:"version"`
	// +kubebuilder:validation:Required
	ClassRef string `json:"classRef"`

	// +kubebuilder:validation:Optional
	Components []Component `json:"components,omitempty"`
	// +kubebuilder:validation:Optional
	Category []string `json:"category,omitempty"`
	// +kube:validation:Optional
	Description string `json:"description,omitempty"`

	// +kubebuilder:validation:Required
	Config Config `json:"config"`
}

// RuntimeStatus defines the observed state of Runtime
type RuntimeStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status

// Runtime is the Schema for the runtimes API
type Runtime struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   RuntimeSpec   `json:"spec,omitempty"`
	Status RuntimeStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

// RuntimeList contains a list of Runtime
type RuntimeList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Runtime `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Runtime{}, &RuntimeList{})
}
