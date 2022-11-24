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
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

/*
apiVersion: v1
kind: ExtensionResourcesPrice
metadata:
  name: xxxx
Spec:
	resources:
		- name:cpu
		unit: 1
		price:1    //  100 = 1¥
		owner:pod-controller
		describe: cpu is the price is 1 cent per minute
*/

// ExtensionResourcesPriceSpec defines the desired state of ExtensionResourcesPrice
type ExtensionResourcesPriceSpec struct {
	ResourceName string                            `json:"resourceName,omitempty"`
	Resources    map[v1.ResourceName]ResourcePrice `json:"resources"`
}

// ExtensionResourcesPriceStatus defines the observed state of ExtensionResourcesPrice
type ExtensionResourcesPriceStatus struct {
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// ExtensionResourcesPrice is the Schema for the extensionresourcesprices API
type ExtensionResourcesPrice struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ExtensionResourcesPriceSpec   `json:"spec,omitempty"`
	Status ExtensionResourcesPriceStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ExtensionResourcesPriceList contains a list of ExtensionResourcesPrice
type ExtensionResourcesPriceList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ExtensionResourcesPrice `json:"items"`
}

func init() {
	SchemeBuilder.Register(&ExtensionResourcesPrice{}, &ExtensionResourcesPriceList{})
}
