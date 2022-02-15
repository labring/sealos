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
	"testing"

	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func Test_convertAppend(t *testing.T) {
	data := `apiVersion: kubeadm.k8s.io/v1beta1
kind: ClusterConfiguration
kubernetesVersion: v1.18.1`
	t.Log(convertAppend(data))
}

func Test_convertClean(t *testing.T) {
	data := `apiVersion: kubeadm.k8s.io/v1beta1
kind: ClusterConfiguration
kubernetesVersion: v1.18.1
metadata:
  name: kubeadm`
	t.Log(convertClean(data))
}

func Test_kFile(t *testing.T) {
	d, _ := getterKFile(v1.GroupVersionKind{
		Group:   "xx",
		Version: "yy",
		Kind:    "zz",
	}, false)
	t.Log(d)
}

func Test_kustomize(t *testing.T) {
	k := NewKubeproxy("10.0.0.2")
	patch := `
- op: add
  path: /ipvs/ffff
  value: beagle
`
	config, err := k.Kustomization(patch)
	if err != nil {
		t.Error(err.Error())
		return
	}
	t.Log(config)
}
