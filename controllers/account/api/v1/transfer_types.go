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
	"fmt"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type TransferState int

const (
	TransferStatePending TransferState = iota
	TransferStateInProgress
	TransferStateCompleted
	TransferStateFailed
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// TransferSpec defines the desired state of Transfer
type TransferSpec struct {
	From string `json:"from,omitempty"`
	To   string `json:"to"`
	// +kubebuilder:validation:Minimum=1000000
	Amount int64 `json:"amount"`
}

// TransferStatus defines the observed state of Transfer
type TransferStatus struct {
	Reason   string        `json:"reason,omitempty"`
	Progress TransferState `json:"progress,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// Transfer is the Schema for the transfers API
type Transfer struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   TransferSpec   `json:"spec,omitempty"`
	Status TransferStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// TransferList contains a list of Transfer
type TransferList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Transfer `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Transfer{}, &TransferList{})
}

func (t *Transfer) ToJSON() string {
	return `{
	"spec": {
		"from": "` + t.Spec.From + `",
		"to": "` + t.Spec.To + `",
		"amount": ` + fmt.Sprint(t.Spec.Amount) + `
	},
	"status": {
		"reason": "` + t.Status.Reason + `",
		"progress": "` + string(rune(t.Status.Progress)) + `"
	}
}`
}
