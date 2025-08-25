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

type Type string

const High Type = "High"
const Medium Type = "Medium"
const Low Type = "Low"

// NotificationSpec defines the desired state of Notification
// UserName and whether read will be set in label,because set in label is ease to query
type NotificationSpec struct {
	Title        string          `json:"title"`
	Message      string          `json:"message"`
	Timestamp    int64           `json:"timestamp"`
	From         string          `json:"from,omitempty"`
	Importance   Type            `json:"importance,omitempty"`
	DesktopPopup bool            `json:"desktopPopup,omitempty"`
	I18n         map[string]I18n `json:"i18ns,omitempty"`
}

type I18n struct {
	Title   string `json:"title"`
	Message string `json:"message"`
	From    string `json:"from,omitempty"`
}

// NotificationStatus defines the observed state of Notification
type NotificationStatus struct {
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// Notification is the Schema for the notifications API
type Notification struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   NotificationSpec   `json:"spec,omitempty"`
	Status NotificationStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// NotificationList contains a list of Notification
type NotificationList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Notification `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Notification{}, &NotificationList{})
}
