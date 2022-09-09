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
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

/*
apiVersion: v1
kind: Metering
metadata:
  name: xxxx
Spec:
//可以一次性设置多个角色的资源限制
    []{
    	owner fanux //必填,基于role的RBAC
    	namespace [""," "] //必填，需要统计的namespace
        resources map[string]resource.Quantity //资源类型，必填
        timestap string //时间戳，用于记录上次统计时间
        timeInterval "* * * * *"  //使用cron形式，不设置的话默认是统计每小时/天/月的使用量
 isSettled true //是否已经结算
}
*/

// MeteringSpec defines the desired state of Metering
type MeteringSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "make" to regenerate code after modifying this file
	ResourceQuota `json:"resourceQuota"`
	Namespaces    []string `json:"namespace"`
	Owner         string   `json:"owner,omitempty"`
}

type ResourceQuota struct {
	Resources    map[corev1.ResourceName]string `json:"resources"`
	TimeStamp    string                         `json:"timeStamp,omitempty"`
	TimeInterval string                         `json:"timeInterval,omitempty"` // TODO maybe using cron is better
	Settled      bool                           `json:"settled,omitempty"`
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
