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
	"github.com/fanux/sealos/pkg/kustomize"
)

type InitConfigPatch struct {
	InitConfig      []kustomize.Patch
	ClusterConfig   []kustomize.Patch
	KubeproxyConfig []kustomize.Patch
	KubeletConfig   []kustomize.Patch
}

type JoinConfigPatch struct {
	JoinConfig    []kustomize.Patch
	KubeletConfig []kustomize.Patch
}

// https://datatracker.ietf.org/doc/html/rfc6902#section-3
var defaultPatchExample = []kustomize.Patch{
	{
		Op:    "add",
		Path:  "/a/b/c",
		Value: []string{"foo", "bar"},
	},
	{
		Op:   "remove",
		Path: "/a/b/c",
	},
	{
		Op:    "replace",
		Path:  "/a/b/c",
		Value: "cccc",
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
		Value: "foo",
	},
}

var defaultPatchEmptyExample []kustomize.Patch

func DefaultInitPatch() InitConfigPatch {
	return InitConfigPatch{
		InitConfig:      defaultPatchExample,
		ClusterConfig:   defaultPatchEmptyExample,
		KubeproxyConfig: defaultPatchEmptyExample,
		KubeletConfig:   defaultPatchEmptyExample,
	}
}

func DefaultJoinPatch() JoinConfigPatch {
	return JoinConfigPatch{
		JoinConfig:    defaultPatchExample,
		KubeletConfig: defaultPatchEmptyExample,
	}
}
