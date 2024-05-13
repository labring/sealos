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

	"github.com/labring/sealos/controllers/pkg/common"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// BillingRecordQuerySpec defines the desired state of BillingRecordQuery
type BillingRecordQuerySpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "make" to regenerate code after modifying this file
	Page      int         `json:"page"`
	PageSize  int         `json:"pageSize"`
	Namespace string      `json:"namespace,omitempty"`
	StartTime metav1.Time `json:"startTime"`
	EndTime   metav1.Time `json:"endTime"`
	OrderID   string      `json:"orderID,omitempty"`
	Type      Type        `json:"type"`
	AppType   string      `json:"appType,omitempty"`
}

// BillingRecordQueryStatus defines the observed state of BillingRecordQuery
type BillingRecordQueryStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
	TotalCount      int                      `json:"totalCount"`
	PageLength      int                      `json:"pageLength"`
	RechargeAmount  int64                    `json:"rechargeAmount"`
	DeductionAmount int64                    `json:"deductionAmount,omitempty"`
	Items           []BillingRecordQueryItem `json:"item,omitempty"`
	Status          string                   `json:"status"`
}

type BillingRecordQueryItem struct {
	Time                         metav1.Time `json:"time" bson:"time"`
	BillingRecordQueryItemInline `json:",inline"`
}

type BillingRecordQueryItemInline struct {
	Name      string      `json:"name,omitempty" bson:"name,omitempty"`
	OrderID   string      `json:"order_id" bson:"order_id"`
	Namespace string      `json:"namespace,omitempty" bson:"namespace,omitempty"`
	Type      common.Type `json:"type" bson:"type"`
	AppType   string      `json:"appType,omitempty" bson:"appType,omitempty"`
	Costs     Costs       `json:"costs,omitempty" bson:"costs,omitempty"`
	//Amount = PaymentAmount + GiftAmount
	Amount int64 `json:"amount,omitempty" bson:"amount"`
	// when Type = Recharge, PaymentAmount is the amount of recharge
	Payment *PaymentForQuery `json:"payment,omitempty" bson:"payment,omitempty"`
}

type PaymentForQuery struct {
	Amount int64 `json:"amount,omitempty" bson:"amount,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// BillingRecordQuery is the Schema for the billingrecordqueries API
type BillingRecordQuery struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   BillingRecordQuerySpec   `json:"spec,omitempty"`
	Status BillingRecordQueryStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// BillingRecordQueryList contains a list of BillingRecordQuery
type BillingRecordQueryList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []BillingRecordQuery `json:"items"`
}

func init() {
	SchemeBuilder.Register(&BillingRecordQuery{}, &BillingRecordQueryList{})
}
