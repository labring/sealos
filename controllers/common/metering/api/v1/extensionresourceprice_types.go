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
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const ExtensionResourcePricePrefix = "extensionresourceprice-"

// ExtensionResourcePriceSpec defines the desired state of ExtensionResourcePrice
type ExtensionResourcePriceSpec struct {
	ResourceName      string                            `json:"resourceName,omitempty"`
	Resources         map[v1.ResourceName]ResourcePrice `json:"resources,omitempty"`
	GroupVersionKinds []GroupVersionKind                `json:"groupVersionKinds"`
}

type GroupVersionKind struct {
	Group   string `json:"group,omitempty"`
	Version string `json:"version,omitempty"`
	Kind    string `json:"kind,omitempty"`
}

type ResourcePrice struct {
	Unit     *resource.Quantity `json:"unit"`
	Price    int64              `json:"price"` // 100 = 1¥
	Describe string             `json:"describe,omitempty"`
}

// ExtensionResourcePriceStatus defines the observed state of ExtensionResourcePrice
type ExtensionResourcePriceStatus struct {
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// ExtensionResourcePrice is the Schema for the extensionresourceprices API
type ExtensionResourcePrice struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ExtensionResourcePriceSpec   `json:"spec,omitempty"`
	Status ExtensionResourcePriceStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ExtensionResourcePriceList contains a list of ExtensionResourcePrice
type ExtensionResourcePriceList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ExtensionResourcePrice `json:"items"`
}

func init() {
	SchemeBuilder.Register(&ExtensionResourcePrice{}, &ExtensionResourcePriceList{})
}

func GetExtensionResourcePriceName(resourceControllerName string) string {
	return ExtensionResourcePricePrefix + resourceControllerName
}
