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
	Description string        `json:"description"`
	Type        InputDataType `json:"type"`
	Default     string        `json:"value"`
	Required    bool          `json:"required"`
}

type Inputs map[string]InputData

// TemplateSpec defines the desired state of Template
type TemplateSpec struct {
	Title        string       `json:"title"`
	URL          string       `json:"url"`
	GitRepo      string       `json:"git_repo"`
	Author       string       `json:"author"`
	Description  string       `json:"description"`
	Readme       string       `json:"readme"`
	Icon         string       `json:"icon"`
	TemplateType TemplateType `json:"template_type"`
	Defaults     Defaults     `json:"defaults"`
	Inputs       Inputs       `json:"inputs"`
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
