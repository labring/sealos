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

const (
	QueryTypeNamespacesHistory = "NamespacesHistory"
	QueryTypeProperties        = "Properties"
	QueryTypeAppType           = "AppType"
	QueryTypeRecharge          = "Recharge"
)

// BillingInfoQuerySpec defines the desired state of BillingInfoQuery
type BillingInfoQuerySpec struct {
	QueryType string            `json:"queryType"`
	Args      map[string]string `json:"args,omitempty"`
}

// BillingInfoQueryStatus defines the observed state of BillingInfoQuery
type BillingInfoQueryStatus struct {
	Result        string `json:"result"`
	Status        Status `json:"status"`
	StatusDetails string `json:"statusDetails"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// BillingInfoQuery is the Schema for the billinginfoqueries API
type BillingInfoQuery struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   BillingInfoQuerySpec   `json:"spec,omitempty"`
	Status BillingInfoQueryStatus `json:"status,omitempty"`
}

type BillingPropertiesForQuery struct {
}

type PropertyQuery struct {
	Name      string  `json:"name" bson:"name"`
	Alias     string  `json:"alias" bson:"alias"`
	UnitPrice float64 `json:"unit_price" bson:"unit_price"`
	Unit      string  `json:"unit" bson:"unit"`
}

//+kubebuilder:object:root=true

// BillingInfoQueryList contains a list of BillingInfoQuery
type BillingInfoQueryList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []BillingInfoQuery `json:"items"`
}

func init() {
	SchemeBuilder.Register(&BillingInfoQuery{}, &BillingInfoQueryList{})
}
