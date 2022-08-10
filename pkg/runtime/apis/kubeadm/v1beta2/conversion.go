/*
Copyright 2019 The Kubernetes Authors.

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

//nolint:all
package v1beta2

import (
	"unsafe"

	corev1 "k8s.io/api/core/v1"
	conversion "k8s.io/apimachinery/pkg/conversion"

	bootstraptokenv1 "github.com/labring/sealos/pkg/runtime/apis/bootstraptoken/v1"
	kubeadm "github.com/labring/sealos/pkg/runtime/apis/kubeadm"
)

func Convert_kubeadm_InitConfiguration_To_v1beta2_InitConfiguration(in *kubeadm.InitConfiguration, out *InitConfiguration, s conversion.Scope) error {
	return autoConvert_kubeadm_InitConfiguration_To_v1beta2_InitConfiguration(in, out, s)
}

func Convert_v1beta2_InitConfiguration_To_kubeadm_InitConfiguration(in *InitConfiguration, out *kubeadm.InitConfiguration, s conversion.Scope) error {
	err := autoConvert_v1beta2_InitConfiguration_To_kubeadm_InitConfiguration(in, out, s)
	if err != nil {
		return err
	}
	// Needed for round-tripping since this field is defaulted in v1beta3
	out.NodeRegistration.ImagePullPolicy = corev1.PullIfNotPresent

	return Convert_v1beta2_ClusterConfiguration_To_kubeadm_ClusterConfiguration(&ClusterConfiguration{}, &out.ClusterConfiguration, s)
}

// Convert_v1beta2_ClusterConfiguration_To_kubeadm_ClusterConfiguration is required since UseHyperKubeImage
// does not exist in the internal type.
func Convert_v1beta2_ClusterConfiguration_To_kubeadm_ClusterConfiguration(in *ClusterConfiguration, out *kubeadm.ClusterConfiguration, s conversion.Scope) error {
	return autoConvert_v1beta2_ClusterConfiguration_To_kubeadm_ClusterConfiguration(in, out, s)
}

// Convert_kubeadm_JoinConfiguration_To_v1beta2_JoinConfiguration is required since v1beta2 does not have SkipPhases in JoinConfiguration
func Convert_kubeadm_JoinConfiguration_To_v1beta2_JoinConfiguration(in *kubeadm.JoinConfiguration, out *JoinConfiguration, s conversion.Scope) error {
	return autoConvert_kubeadm_JoinConfiguration_To_v1beta2_JoinConfiguration(in, out, s)
}

// Convert_kubeadm_NodeRegistrationOptions_To_v1beta2_NodeRegistrationOption is required since v1beta2 does not have NodeRegistrationOption.ImagePullPolicy
func Convert_kubeadm_NodeRegistrationOptions_To_v1beta2_NodeRegistrationOptions(in *kubeadm.NodeRegistrationOptions, out *NodeRegistrationOptions, s conversion.Scope) error {
	return autoConvert_kubeadm_NodeRegistrationOptions_To_v1beta2_NodeRegistrationOptions(in, out, s)
}

// Convert_v1beta2_JoinConfiguration_To_kubeadm_JoinConfiguration is required since v1beta2 does not have NodeRegistrationOption.ImagePullPolicy
// and to make round-tripping happy.
func Convert_v1beta2_JoinConfiguration_To_kubeadm_JoinConfiguration(in *JoinConfiguration, out *kubeadm.JoinConfiguration, s conversion.Scope) error {
	err := autoConvert_v1beta2_JoinConfiguration_To_kubeadm_JoinConfiguration(in, out, s)
	if err != nil {
		return err
	}
	out.NodeRegistration.ImagePullPolicy = corev1.PullIfNotPresent
	return nil
}

// Convert_v1beta2_BootstrapToken_To_v1_BootstrapToken is required so that we can directly
// cast a v1beta1.BootstrapToken to v1.BootstrapToken using unsafe.Pointer and not
// field by field.
func Convert_v1beta2_BootstrapToken_To_v1_BootstrapToken(in *BootstrapToken, out *bootstraptokenv1.BootstrapToken, s conversion.Scope) error {
	*out = *(*bootstraptokenv1.BootstrapToken)(unsafe.Pointer(in))
	return nil
}

// Convert_v1_BootstrapToken_To_v1beta2_BootstrapToken is required so that we can directly
// cast a v1.BootstrapToken to v1beta1.BootstrapToken using unsafe.Pointer and not
// field by field.
func Convert_v1_BootstrapToken_To_v1beta2_BootstrapToken(in *bootstraptokenv1.BootstrapToken, out *BootstrapToken, s conversion.Scope) error {
	*out = *(*BootstrapToken)(unsafe.Pointer(in))
	return nil
}
