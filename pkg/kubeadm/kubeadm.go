/*
Copyright 2022 cuisongliu@qq.com.

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

package kubeadm

import (
	"errors"
	"strings"

	v1 "github.com/fanux/sealos/pkg/types/v1beta1"

	"github.com/fanux/sealos/pkg/token"
	"github.com/fanux/sealos/pkg/utils/versionutil"
)

type Kubeadm interface {
	DefaultConfig() (string, error)
	Kustomization(patchs []v1.Patch) (string, error)
	DefaultTemplate() string
}

const (
	V1130 = "v1.13.0"
	V1150 = "v1.15.0"
	V1220 = "v1.22.0"

	KubeadmV1beta1 = "v1beta1"
	KubeadmV1beta2 = "v1beta2"
	KubeadmV1beta3 = "v1beta3"
)

func ValidateKubeVersionForKubeadm(kubeVersion string) error {
	if kubeVersion == "" {
		return errors.New("kubernetes version must not empty")
	}
	kubeadmVersion := GetterKubeadmAPIVersion(kubeVersion)
	if kubeadmVersion == "" {
		return errors.New("kubernetes version must great and equal 1.15 ")
	}
	return nil
}

//GetterKubeadmAPIVersion is covert version to kubeadmAPIServerVersion
// The support matrix will look something like this now and in the future:
// v1.10 and earlier: v1alpha1
// v1.11: v1alpha1 read-only, writes only v1alpha2 config
// v1.12: v1alpha2 read-only, writes only v1alpha3 config. Errors if the user tries to use v1alpha1
// v1.13: v1alpha3 read-only, writes only v1beta1 config. Errors if the user tries to use v1alpha1 or v1alpha2
// v1.14: v1alpha3 convert only, writes only v1beta1 config. Errors if the user tries to use v1alpha1 or v1alpha2
// v1.15: v1beta1 read-only, writes only v1beta2 config. Errors if the user tries to use v1alpha1, v1alpha2 or v1alpha3
// v1.22: v1beta2 read-only, writes only v1beta3 config. Errors if the user tries to use v1beta1 and older
func GetterKubeadmAPIVersion(kubeVersion string) string {
	var apiVersion string
	switch {
	//kubernetes gt 1.13, lt 1.15
	case versionutil.Compare(kubeVersion, V1130) && !versionutil.Compare(kubeVersion, V1150):
		apiVersion = KubeadmV1beta1
	//kubernetes gt 1.15, lt 1.22
	case versionutil.Compare(kubeVersion, V1150) && !versionutil.Compare(kubeVersion, V1220):
		apiVersion = KubeadmV1beta2
	// kubernetes gt 1.22,
	case versionutil.Compare(kubeVersion, V1220):
		apiVersion = KubeadmV1beta3
	default:
		apiVersion = KubeadmV1beta2
	}
	return apiVersion
}

func GetterInitKubeadmConfig(k8sVersion, master0, apiserverDomain, podCIDR, svcCIDR, vip, cri string, patch, sans []string) (string, error) {
	config, err := kubeadms(patch)
	if err != nil {
		return "", err
	}

	i := NewInit(k8sVersion, master0, cri)
	ic, err := i.Kustomization(config.Spec.InitConfig)
	if err != nil {
		return "", err
	}
	c := NewCluster(k8sVersion, apiserverDomain, podCIDR, svcCIDR, sans)
	cc, err := c.Kustomization(config.Spec.ClusterConfig)
	if err != nil {
		return "", err
	}
	kp := NewKubeproxy(vip)
	kpc, err := kp.Kustomization(config.Spec.KubeProxyConfig)
	if err != nil {
		return "", err
	}
	kl := NewKubelet()
	klc, err := kl.Kustomization(config.Spec.KubeletConfig)
	if err != nil {
		return "", err
	}

	data := strings.Join([]string{ic, cc, kpc, klc}, "\n---\n")
	return data, nil
}

func GetterJoinMasterKubeadmConfig(k8sVersion, master0, masterIP, cri string, patch []string, t token.Token) (string, error) {
	config, err := kubeadms(patch)
	if err != nil {
		return "", err
	}
	i := NewJoinMaster(k8sVersion, cri, master0, masterIP, t)
	ic, err := i.Kustomization(config.Spec.JoinConfig)
	if err != nil {
		return "", err
	}
	kl := NewKubelet()
	klc, err := kl.Kustomization(config.Spec.KubeletConfig)
	if err != nil {
		return "", err
	}

	data := strings.Join([]string{ic, klc}, "\n---\n")
	return data, nil
}

func GetterJoinNodeKubeadmConfig(k8sVersion, vip, cri string, patch []string, t token.Token) (string, error) {
	config, err := kubeadms(patch)
	if err != nil {
		return "", err
	}
	i := NewJoinNode(k8sVersion, cri, vip, t)
	ic, err := i.Kustomization(config.Spec.JoinConfig)
	if err != nil {
		return "", err
	}
	kl := NewKubelet()
	klc, err := kl.Kustomization(config.Spec.KubeletConfig)
	if err != nil {
		return "", err
	}

	data := strings.Join([]string{ic, klc}, "\n---\n")
	return data, nil
}

func hasPatch(patch []v1.Patch) bool {
	return len(patch) != 0
}
