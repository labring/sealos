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

type Data struct {
	URL  string `json:"url,omitempty"`
	Desc string `json:"desc,omitempty"`
}

type MenuData struct {
	Name string `json:"name,omitempty"`
	Link string `json:"link,omitempty"`
}

type DisplayType string

// data types
const (
	DisplayNormal DisplayType = "normal"
	DisplayMore   DisplayType = "more"
	DisplayHidden DisplayType = "hidden"
)

// AppMeta Base Information
type AppMeta struct {
	Name string `json:"name,omitempty"`
	Icon string `json:"icon,omitempty"`
	Type string `json:"type,omitempty"`

	//+kubebuilder:validation:Enum={ normal, more, hidden, }
	//+kubebuilder:validation:Optional
	DisplayType DisplayType `json:"displayType,omitempty"`

	Data     Data       `json:"data,omitempty"`
	MenuData []MenuData `json:"menuData,omitempty"`
}

// AppSpec defines the desired state of App
type AppSpec struct {
	AppMeta `json:",inline"`

	//+kubebuilder:validation:Optional
	I18N *map[string]AppMeta `json:"i18n,omitempty"`
}

// AppStatus defines the observed state of App
type AppStatus struct {
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// App is the Schema for the apps API
type App struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AppSpec   `json:"spec,omitempty"`
	Status AppStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// AppList contains a list of App
type AppList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []App `json:"items"`
}

func init() {
	SchemeBuilder.Register(&App{}, &AppList{})
}
