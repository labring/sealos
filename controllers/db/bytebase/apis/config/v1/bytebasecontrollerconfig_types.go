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
	cfg "sigs.k8s.io/controller-runtime/pkg/config/v1alpha1"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope:namespaced,shortName=bcc,singular=bytebasecontrollerconfig

// BytebaseControllerConfig is the Schema for the bytebasecontrollerconfigs API
type BytebaseControllerConfig struct {
	metav1.TypeMeta `json:",inline"`
	// ControllerManagerConfigurationSpec returns the configurations for controllers
	cfg.ControllerManagerConfigurationSpec `json:",inline"`
	RootDomain                             string `json:"rootDomain,omitempty"`
	SecretName                             string `json:"secretName,omitempty"`
	SecretNamespace                        string `json:"secretNamespace,omitempty"`
	Debug                                  bool   `json:"debug,omitempty"`
	Debug2                                 bool   `json:"debug2,omitempty"`
}

func init() {
	SchemeBuilder.Register(&BytebaseControllerConfig{})
}
