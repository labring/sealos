/*
Copyright 2022.

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

// ActionsSpec defines the desired state of Actions
type ActionsSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "make" to regenerate code after modifying this file

	// Application name, actions will bind to an application
	AppName string `json:"appName,omitempty"`
	// Alias will show it on dashboard. like DELETE UPDATE MIGRATE...
	Alias string `json:"alias,omitempty"`
	// Args, the actions input args, like oss backup address...
	Args map[string]string `json:"args,omitempty"`
	// Actions exec command, support render some args and downward API, like application name, service name ...
	CMD string `json:"cmd,omitempty"`
}

// ActionsStatus defines the observed state of Actions
type ActionsStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// Actions is the Schema for the actions API
type Actions struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ActionsSpec   `json:"spec,omitempty"`
	Status ActionsStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ActionsList contains a list of Actions
type ActionsList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Actions `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Actions{}, &ActionsList{})
}
