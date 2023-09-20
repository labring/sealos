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

// PaymentSpec defines the desired state of Payment
type PaymentSpec struct {
	// UserID is the user id who want to recharge
	UserID string `json:"userID,omitempty"`
	// Amount is the amount of recharge
	Amount int64 `json:"amount,omitempty"`
	// e.g. wechat, alipay, creditcard, etc.
	//+kubebuilder:default:=wechat
	PaymentMethod string `json:"paymentMethod,omitempty"`
	// Service is the service to be charged
	Service Service `json:"service,omitempty"`
}

// PaymentStatus defines the observed state of Payment
type PaymentStatus struct {
	// TradeNO is the tradeNO of wechatpay
	TradeNO string `json:"tradeNO,omitempty"`
	// CodeURL is the codeURL of wechatpay
	CodeURL string `json:"codeURL,omitempty"`
	// Status is the status of wechatpay, create,completed
	Status string `json:"status,omitempty"`
	// Token is the token of license
	Token string `json:"token,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// Payment is the Schema for the payments API
type Payment struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   PaymentSpec   `json:"spec,omitempty"`
	Status PaymentStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// PaymentList contains a list of Payment
type PaymentList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Payment `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Payment{}, &PaymentList{})
}

type Service struct {
	// ClusterID is the cluster id which the user want to license
	Hid string `json:"hid,omitempty"`
	// amt is a service field, which is the amount to be charged
	Amt int64 `json:"amt,omitempty"`
	// add more fields
}
