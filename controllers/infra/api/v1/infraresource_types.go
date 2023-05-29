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
	meteringcommonv1 "github.com/labring/sealos/controllers/common/metering/api/v1"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// InfraResourceSpec defines the desired state of InfraResource
type InfraResourceSpec struct {
	ResourceName string                                             `json:"resourceName,omitempty"`
	Resources    map[v1.ResourceName]meteringcommonv1.ResourcePrice `json:"resources,omitempty"`

	// update used resources every Interval minutes
	//+kubebuilder:validation:Minimum=1
	Interval int `json:"interval,omitempty"`
}

// InfraResourceStatus defines the observed state of InfraResource
type InfraResourceStatus struct {
	LatestUpdateTime int64 `json:"latestUpdateTime,omitempty"`
	SeqID            int64 `json:"seqID,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// InfraResource is the Schema for the Infraresources API
type InfraResource struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   InfraResourceSpec   `json:"spec,omitempty"`
	Status InfraResourceStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// InfraResourceList contains a list of InfraResource
type InfraResourceList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []InfraResource `json:"items"`
}

func init() {
	SchemeBuilder.Register(&InfraResource{}, &InfraResourceList{})
}
