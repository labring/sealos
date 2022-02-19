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
	"github.com/fanux/sealos/pkg/types/v1beta1"
	"k8s.io/apimachinery/pkg/runtime"
)

// https://datatracker.ietf.org/doc/html/rfc6902#section-3
var defaultPatchExample = []v1beta1.Patch{
	{
		Op:    "add",
		Path:  "/a/b/c",
		Value: runtime.Unknown{Raw: []byte("[ \"foo\", \"bar\" ]")},
	},
	{
		Op:   "remove",
		Path: "/a/b/c",
	},
	{
		Op:    "replace",
		Path:  "/a/b/c",
		Value: runtime.Unknown{Raw: []byte("42")},
	},
	{
		Op:   "move",
		Path: "/a/b/c",
		From: "/a/b/d",
	},
	{
		Op:   "copy",
		Path: "/a/b/c",
		From: "/a/b/d",
	},
	{
		Op:    "test",
		Path:  "/a/b/c",
		Value: runtime.Unknown{Raw: []byte("\"foo\"")},
	},
}

var defaultPatchEmptyExample []v1beta1.Patch

func DefaultPatchDefault() v1beta1.KubeadmConfig {
	config := v1beta1.KubeadmConfig{}
	config.APIVersion = v1beta1.SchemeGroupVersion.String()
	config.Kind = "KubeadmConfig"
	config.Name = "kubeadm-patch"
	config.Spec.InitConfig = defaultPatchExample
	config.Spec.ClusterConfig = defaultPatchEmptyExample
	config.Spec.KubeProxyConfig = defaultPatchEmptyExample
	config.Spec.KubeletConfig = defaultPatchEmptyExample
	config.Spec.JoinConfig = defaultPatchEmptyExample
	return config
}
