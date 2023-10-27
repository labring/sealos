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

// PriceQuerySpec defines the desired state of PriceQuery
type PriceQuerySpec struct {
}

// PriceQueryStatus defines the observed state of PriceQuery
type PriceQueryStatus struct {
	BillingRecords []BillingRecord `json:"billingRecords,omitempty"`
}

type BillingRecord struct {
	ResourceType string `json:"resourceType"`
	Price        string `json:"price"`
	DiscountType string `json:"discountType,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// PriceQuery is the Schema for the pricequeries API
type PriceQuery struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   PriceQuerySpec   `json:"spec,omitempty"`
	Status PriceQueryStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// PriceQueryList contains a list of PriceQuery
type PriceQueryList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []PriceQuery `json:"items"`
}

func init() {
	SchemeBuilder.Register(&PriceQuery{}, &PriceQueryList{})
}
