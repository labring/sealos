/*
Copyright 2022 labring.

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

/*
If user want to recharge, just using kubectl apply -f payment.yaml, he will get the codeURL, convert it to QRcode and scan it.

apiVersion: user.sealos.io/v1
kind: Payment
metadata:
  name: payment-sample
spec:
  UserID: fanux
  Amount: 1

CodeURL: weixin://wxpay/bizpayurl?pr=aIQrOYOzz

The controller log will show the QRcode
*/

// PaymentSpec defines the desired state of Payment
type PaymentSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "make" to regenerate code after modifying this file

	// UserID is the user id who want to recharge
	UserID string `json:"userID,omitempty"`
	// Amount is the amount of recharge
	Amount int64 `json:"amount,omitempty"`
}

// PaymentStatus defines the observed state of Payment
type PaymentStatus struct {
	// TradeNO is the tradeNO of wechatpay
	TradeNO string `json:"tradeNO,omitempty"`
	// CodeURL is the codeURL of wechatpay
	CodeURL string `json:"codeURL,omitempty"`
	// Status is the status of wechatpay, charging, closed, timeout
	Status string `json:"status,omitempty"`
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
