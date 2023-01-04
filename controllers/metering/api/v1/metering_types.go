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
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type TimeIntervalType string

const (
	MINUTE TimeIntervalType = "Minute"
	HOUR   TimeIntervalType = "Hour"
	DAY    TimeIntervalType = "Day"
)

/*
apiVersion: v1
kind: Metering
metadata:
  name: xxxx
Spec:
    	owner: fanux
    	namespace: string
        resources: v1.ResourceList // resource type
		timeInterval:59 // time interval
*/

// MeteringSpec defines the desired state of Metering
type MeteringSpec struct {
	Namespace string `json:"namespace"`
	Owner     string `json:"owner"`

	//timeInterval unit is minutes
	TimeInterval int                                          `json:"timeInterval,omitempty"`
	Resources    map[corev1.ResourceName]ResourcePriceAndUsed `json:"resources,omitempty"`
}

// MeteringStatus defines the observed state of Metering
type MeteringStatus struct {
	BillingListH     []BillingList `json:"billingListH,omitempty"`
	BillingListD     []BillingList `json:"billingListD,omitempty"`
	TotalAmount      int64         `json:"totalAmount,omitempty"`
	LatestUpdateTime int64         `json:"latestUpdateTime,omitempty"`
	SeqID            int64         `json:"seqID,omitempty"`
}

type ResourcePrice struct {
	Unit     *resource.Quantity `json:"unit"`
	Price    int64              `json:"price"` // 100 = 1¥
	Describe string             `json:"describe,omitempty"`
}

type ResourcePriceAndUsed struct {
	ResourcePrice `json:",inline"`
	Used          *resource.Quantity `json:"used,omitempty"`
}

type ResourceMsg struct {
	ResourceName corev1.ResourceName
	Amount       float64
	Used         *resource.Quantity
	Unit         *resource.Quantity
}

type BillingList struct {
	TimeStamp    int64            `json:"timeStamp,omitempty"`
	TimeInterval TimeIntervalType `json:"timeInterval,omitempty"` //time interval，/Minute/Hour/Day
	Settled      bool             `json:"settled,omitempty"`      //is settled
	Amount       int64            `json:"amount,omitempty"`       //need to pay amount,100 = 1¥
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="owner",type=string,JSONPath=".spec.owner"
// +kubebuilder:printcolumn:name="totalAmount",type=integer,JSONPath=".status.totalAmount",description=" The last two digits are decimals ,100 = 1¥"
// +kubebuilder:printcolumn:name="Age",type="date",JSONPath=".metadata.creationTimestamp"

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

func DefaultResourceQuota() corev1.ResourceList {
	return corev1.ResourceList{
		//corev1.ResourceRequestsCPU:    resource.MustParse("100"),
		corev1.ResourceLimitsCPU: resource.MustParse("16"),
		//corev1.ResourceRequestsMemory: resource.MustParse("100"),
		corev1.ResourceLimitsMemory: resource.MustParse("64Gi"),
		//For all PVCs, the total demand for storage resources cannot exceed this value
		corev1.ResourceRequestsStorage: resource.MustParse("100Gi"),
		//"limit.storage": resource.MustParse("100Gi"),
		//Local ephemeral storage
		corev1.ResourceLimitsEphemeralStorage: resource.MustParse("100Gi"),
		//corev1.ResourceRequestsEphemeralStorage: resource.MustParse("100Gi"),
	}
}
