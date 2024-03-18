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

type TemplateType string

const (
	TemplateTypeInline string = "inline"
)

type DefaultDataType string

const (
	DefaultDataTypeString = "string"
	DefaultDataTypeNumber = "number"
)

type DefaultData struct {
	Type  DefaultDataType `json:"type"`
	Value string          `json:"value"`
}

type Defaults map[string]DefaultData

type InputDataType string

const (
	InputDataTypeString = "string"
	InputDataTypeNumber = "number"
)

type InputData struct {
	Description string        `json:"description,omitempty"`
	Type        InputDataType `json:"type"`
	Default     string        `json:"default,omitempty"`
	Required    bool          `json:"required,omitempty"`
}

type Inputs map[string]InputData

type TemplateData struct {
	Title        string       `json:"title"`
	URL          string       `json:"url,omitempty"`
	GitRepo      string       `json:"gitRepo,omitempty"`
	Author       string       `json:"author,omitempty"`
	Description  string       `json:"description,omitempty"`
	Readme       string       `json:"readme,omitempty"`
	Icon         string       `json:"icon,omitempty"`
	TemplateType TemplateType `json:"templateType"`
	Draft        bool         `json:"draft,omitempty"`
	Categories   []string     `json:"categories,omitempty"`
	Defaults     Defaults     `json:"defaults,omitempty"`
	Inputs       Inputs       `json:"inputs,omitempty"`
}

// TemplateSpec defines the desired state of Template
// +kubebuilder:validation:XValidation:rule="'app_name' in self.defaults",message="defaults must have app_name key"
type TemplateSpec struct {
	TemplateData `json:",inline"`
}

// TemplateStatus defines the observed state of Template
type TemplateStatus struct {
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// Template is the Schema for the templates API
type Template struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   TemplateSpec   `json:"spec,omitempty"`
	Status TemplateStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// TemplateList contains a list of Template
type TemplateList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Template `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Template{}, &TemplateList{})
}
