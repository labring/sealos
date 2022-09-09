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
kind: Metering
metadata:
  name: xxxx
Spec:
    	owner: fanux //必填,基于role的RBAC
    	namespace: string //必填，需要统计的namespace
        resources: v1.ResourceList //资源类型，必填
        BillingListM,BillingListH,BillingListD[]{
             timestamp: int64 //时间戳
             timeInterval string //间隔多久，/分钟级/小时级/天级
             amount float64     // 需要支付的金额
             isSettled:  true //是否已经结算
        }
*/

// MeteringSpec defines the desired state of Metering
type MeteringSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "make" to regenerate code after modifying this file
	Resources    v1.ResourceList `json:"resources"`
	Namespace    string          `json:"namespace"`
	Owner        string          `json:"owner"` // todo add rbac
	BillingListM []BillingList   `json:"billingListM,omitempty"`
	BillingListH []BillingList   `json:"billingListH,omitempty"`
	BillingListD []BillingList   `json:"billingListD,omitempty"`
}

type BillingList struct {
	TimeStamp    int64  `json:"timeStamp,omitempty"`    //时间戳
	TimeInterval string `json:"timeInterval,omitempty"` //间隔 minute/hour/day
	Settled      bool   `json:"settled,omitempty"`      //是否结账
	Amount       int64  `json:"amount,omitempty"`       //所需金额
}

// MeteringStatus defines the observed state of Metering
type MeteringStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// Metering is the Schema for the meterings API
type Metering struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   MeteringSpec   `json:"spec,omitempty"`
	Status MeteringStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// MeteringList contains a list of Metering
type MeteringList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Metering `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Metering{}, &MeteringList{})
}
