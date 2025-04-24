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

// ShutdownType defines the type of shutdown to perform
// +kubebuilder:validation:Enum=Stop;Terminate
type ShutdownType string

const (
	// Stopped indicates the devbox should be stopped
	Stopped ShutdownType = "Stopped"
)

// ShutdownState defines the current state of the shutdown process
// +kubebuilder:validation:Enum=Pending;Completed;Unknown
type ShutdownState string

const (
	// ShutdownStatePending indicates the shutdown is scheduled but not yet executed
	ShutdownStatePending ShutdownState = "Pending"
	// ShutdownStateCompleted indicates the shutdown has been executed
	ShutdownStateCompleted ShutdownState = "Completed"
	// ShutdownStateUnknown indicates the shutdown state is unknown
	ShutdownStateUnknown ShutdownState = "Unknown"
)

// ScheduledShutdownSpec defines the desired state of ScheduledShutdown.
type ScheduledShutdownSpec struct {
	// +kubebuilder:validation:Required
	DevBoxName string `json:"devBoxName"`

	// Format: RFC3339 (e.g., "2006-01-02T15:04:05Z")
	// +kubebuilder:validation:Required
	ShutdownTime metav1.Time `json:"shutdownTime"`

	// +kubebuilder:validation:Required
	// +kubebuilder:default=Stop
	ShutdownType ShutdownType `json:"shutdownType"`
}

// ScheduledShutdownStatus defines the observed state of ScheduledShutdown.
type ScheduledShutdownStatus struct {
	// State represents the current state of the scheduled shutdown
	// +kubebuilder:default=Unknown
	State ShutdownState `json:"state,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="DevBox",type=string,JSONPath=`.spec.devBoxName`
// +kubebuilder:printcolumn:name="ShutdownTime",type=string,JSONPath=`.spec.shutdownTime`
// +kubebuilder:printcolumn:name="ShutdownType",type=string,JSONPath=`.spec.shutdownType`
// +kubebuilder:printcolumn:name="State",type=string,JSONPath=`.status.state`

// ScheduledShutdown is the Schema for the scheduledshutdowns API.
type ScheduledShutdown struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ScheduledShutdownSpec   `json:"spec,omitempty"`
	Status ScheduledShutdownStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

// ScheduledShutdownList contains a list of ScheduledShutdown.
type ScheduledShutdownList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ScheduledShutdown `json:"items"`
}

func init() {
	SchemeBuilder.Register(&ScheduledShutdown{}, &ScheduledShutdownList{})
}
