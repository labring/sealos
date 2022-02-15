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

import "github.com/fanux/sealos/pkg/utils/versionutil"

type Kubeadm interface {
	DefaultConfig() (string, error)
	Kustomization(patch string) (string, error)
}

const (
	V1200 = "v1.20.0"
	V1230 = "v1.23.0"

	KubeadmV1beta1 = "v1beta1"
	KubeadmV1beta2 = "v1beta2"
	KubeadmV1beta3 = "v1beta3"
)

func getterKubeadmAPIVersion(kubeVersion string) string {
	var apiVersion string
	switch {
	//kubernetes gt 1.20, lt 1.23
	case versionutil.Compare(kubeVersion, V1200) && !versionutil.Compare(kubeVersion, V1230):
		apiVersion = KubeadmV1beta2
	// kubernetes gt 1.23,
	case versionutil.Compare(kubeVersion, V1230):
		apiVersion = KubeadmV1beta3
	// kubernetes lt 1.20
	default:
		apiVersion = KubeadmV1beta1
	}
	return apiVersion
}
