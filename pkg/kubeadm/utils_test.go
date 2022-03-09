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

	"k8s.io/apimachinery/pkg/runtime"

	"github.com/fanux/sealos/pkg/types/v1beta1"

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
	k := NewCluster("v1.19.1","xxxx","10.0.0.1","10.0.0.2","10.0.0.2",[]string{"127.0.0.2"},[]string{"xxxdddd"})
	config, err := k.Kustomization([]v1beta1.Patch{
		{
			Op:    "add",
			Path:  "/ipvs/ffff",
			From:  "",
			Value: runtime.Unknown{Raw: []byte("\"beagle\"")},
		},
	})
	if err != nil {
		t.Error(err.Error())
		return
	}
	t.Log(config)
	config, err = k.Kustomization([]v1beta1.Patch{
		{
			Op:    "add",
			Path:  "/ipvs/ffff",
			From:  "",
			Value: runtime.Unknown{Raw: []byte("\"beagle\"")},
		},
	})
	if err != nil {
		t.Error(err.Error())
		return
	}
	t.Log(config)
}
