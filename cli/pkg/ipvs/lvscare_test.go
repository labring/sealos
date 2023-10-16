// Copyright © 2021 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package ipvs

import (
	"testing"

	"github.com/labring/sealos/pkg/constants"
)

var want = []string{
	`apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: null
  name: kube-sealos-lvscare
  namespace: kube-system
spec:
  containers:
  - args:
    - care
    - --vs
    - 10.10.10.10
    - --health-path
    - /healthz
    - --health-schem
    - https
    - --rs
    - 116.31.96.134:6443
    - --rs
    - 116.31.96.135:6443
    - --rs
    - 116.31.96.136:6443
    - --aa
    command:
    - /usr/bin/lvscare
    image: fanux/lvscare:latest
    imagePullPolicy: IfNotPresent
    name: kube-sealos-lvscare
    resources: {}
    securityContext:
      privileged: true
    volumeMounts:
    - mountPath: /lib/modules
      name: lib-modules
      readOnly: true
  hostNetwork: true
  priorityClassName: system-node-critical
  volumes:
  - hostPath:
      path: /lib/modules
      type: ""
    name: lib-modules
status: {}
`,
}

func TestLvsStaticPodYaml(t *testing.T) {
	type args struct {
		vip     string
		masters []string
		image   string
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{
			"test generate lvscare static pod",
			args{
				"10.10.10.10",
				[]string{"116.31.96.134:6443", "116.31.96.135:6443", "116.31.96.136:6443"},
				"fanux/lvscare:latest",
			},
			want[0],
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got, _ := LvsStaticPodYaml(tt.args.vip, tt.args.masters, tt.args.image, constants.LvsCareStaticPodName, []string{"--aa"}); got != tt.want {
				t.Errorf("LvsStaticPodYaml() = %v, want %v", got, tt.want)
			}
		})
	}
}
