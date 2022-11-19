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

const (
	ChargeStatusCharging = "charging"
	ChargeStatusClosed   = "closed"
	ChargeStatusTimeOUT  = "timeout"
)

/*
   paymentService          AccountController    wechatpay
         |                     |                    |
         |-----payment order----------------------->|
         |<----codeURL------------------------------|
         |                     |                    |
         |-----apply Charge--->|                    |
         |                     |-------Query------->|
         |                     |<--set status close-|
         |                     |                    |

Query the Charging status Order, and get it status, if success, add the Amount to Account Balance the set status to closed.
*/

// Account is for user balance, when the balance is 0, the controller will warn the user and clean all
// namespace create by the user.

type Charge struct {
	Amount  int64       `json:"balance,omitempty"`
	Time    metav1.Time `json:"time,omitempty"`
	Status  string      `json:"status,omitempty"`
	TradeNO string      `json:"tradeNO,omitempty"`
}

// AccountSpec defines the desired state of Account
type AccountSpec struct{}

// AccountStatus defines the observed state of Account
type AccountStatus struct {
	Balance int64 `json:"balance,omitempty"`
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
	ChargeList []Charge `json:"chargeList,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// Account is the Schema for the accounts API
type Account struct {
	// Using userID as Account name
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AccountSpec   `json:"spec,omitempty"`
	Status AccountStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// AccountList contains a list of Account
type AccountList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Account `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Account{}, &AccountList{})
}
