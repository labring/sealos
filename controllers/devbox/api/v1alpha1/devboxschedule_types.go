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

// ScheduleType defines the type of shutdown to perform
// +kubebuilder:validation:Enum=Stopped;Shutdown
type ScheduleType string

const (
	// ScheduleStopped indicates the devbox should be stopped
	ScheduleStopped ScheduleType = "Stopped"
	// ScheduleShutdown indicates the devbox should be shutdown
	ScheduleShutdown ScheduleType = "Shutdown"
)

// DevBoxScheduleSpec defines the desired state of DevBoxSchedule.
type DevBoxScheduleSpec struct {
	// +kubebuilder:validation:Required
	DevBoxName string `json:"devBoxName"`

	// Format: RFC3339 (e.g., "2006-01-02T15:04:05Z")
	// +kubebuilder:validation:Required
	ScheduleTime metav1.Time `json:"scheduleTime"`

	// +kubebuilder:validation:Required
	// +kubebuilder:default=Stopped
	ScheduleType ScheduleType `json:"scheduleType"`

	// State represents the current state of the scheduled shutdown
	// +kubebuilder:validation:Required
	// +kubebuilder:default=Pending
	State ScheduleState `json:"state,omitempty"`
}

// ScheduleState defines the current state of the devbox schedule process
// +kubebuilder:validation:Enum=Pending;Completed;Unknown;NotFound;NotMatch
type ScheduleState string

const (
	// ScheduleStatePending indicates the scheduled but not yet executed
	ScheduleStatePending ScheduleState = "Pending"
	// ScheduleStateCompleted indicates the schedule has been executed
	ScheduleStateCompleted ScheduleState = "Completed"
	// ScheduleStateUnknown indicates the schedule state is unknown
	ScheduleStateUnknown ScheduleState = "Unknown"
	// ScheduleStateNotFound indicates the devbox is not found.
	ScheduleStateNotFound ScheduleState = "NotFound"
	// ScheduleStateNotMatch indicates the devbox uid is not match.
	ScheduleStateNotMatch ScheduleState = "NotMatch"
)

// DevBoxScheduleStatus defines the observed state of DevBoxSchedule.
type DevBoxScheduleStatus struct {
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status

// DevBoxSchedule is the Schema for the devboxschedules API.
type DevBoxSchedule struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   DevBoxScheduleSpec   `json:"spec,omitempty"`
	Status DevBoxScheduleStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

// DevBoxScheduleList contains a list of DevBoxSchedule.
type DevBoxScheduleList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []DevBoxSchedule `json:"items"`
}

func init() {
	SchemeBuilder.Register(&DevBoxSchedule{}, &DevBoxScheduleList{})
}
