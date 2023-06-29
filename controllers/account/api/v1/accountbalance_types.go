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

const AccountBalancePrefix = "accountbalance"

type (
	Status string
	Type   int
)

const (
	// Consumption 消费
	Consumption Type = iota
	// Recharge 充值
	Recharge
	TransferIn
	TransferOut
)

const (
	Completed Status = "completed"
	Create    Status = "create"
	Failed    Status = "failed"
)

type Costs map[string]int64

// AccountBalanceSpec defines the desired state of AccountBalance
type AccountBalanceSpec struct {
	OrderID string      `json:"order_id" bson:"order_id"`
	Owner   string      `json:"owner" bson:"owner"`
	Time    metav1.Time `json:"time" bson:"time"`
	Type    Type        `json:"type" bson:"type"`
	Costs   Costs       `json:"costs,omitempty" bson:"costs,omitempty"`
	// TODO will delete field in future
	//Timestamp int64 `json:"timestamp,omitempty"`
	Amount  int64  `json:"amount,omitempty" bson:"amount"`
	Details string `json:"details,omitempty" bson:"details,omitempty"`
	//ResourceInfoList meteringcommonv1.ResourceInfoList `json:"resourceInfoList,omitempty"`
}

// AccountBalanceStatus defines the observed state of AccountBalance
type AccountBalanceStatus struct {
	Status Status `json:"billingStatus,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:printcolumn:name="Amount",type=integer,JSONPath=".spec.amount"

// AccountBalance is the Schema for the accountbalances API
type AccountBalance struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AccountBalanceSpec   `json:"spec,omitempty"`
	Status AccountBalanceStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// AccountBalanceList contains a list of AccountBalance
type AccountBalanceList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []AccountBalance `json:"items"`
}

func init() {
	SchemeBuilder.Register(&AccountBalance{}, &AccountBalanceList{})
}
