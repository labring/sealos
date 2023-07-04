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
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// LauncherSpec defines the desired state of Launcher
type LauncherSpec struct {
	Name        string `json:"name,omitempty"`
	Description string `json:"description,omitempty"`
}

// LauncherStatus defines the observed state of Launcher
type LauncherStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// Launcher is the Schema for the launchers API
type Launcher struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   LauncherSpec   `json:"spec,omitempty"`
	Status LauncherStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// LauncherList contains a list of Launcher
type LauncherList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Launcher `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Launcher{}, &LauncherList{})
}
