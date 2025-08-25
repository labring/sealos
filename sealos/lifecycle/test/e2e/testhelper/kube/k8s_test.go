// Copyright © 2023 sealos.
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

package kube

import (
	"testing"
)

func TestNewK8sClient(t *testing.T) {
	type args struct {
		kubeconfig string
		apiServer  string
	}
	tests := []struct {
		name    string
		args    args
		want    K8s
		wantErr bool
	}{
		// TODO: Add test cases.
		{
			name: "test",
			args: args{
				kubeconfig: "./kube.conf",
				apiServer:  "https://47.96.254.165:6443",
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := NewK8sClient(tt.args.kubeconfig, tt.args.apiServer)
			if (err != nil) != tt.wantErr {
				t.Errorf("NewK8sClient() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			nodeList, err := got.ListNodes()
			if err != nil {
				t.Errorf("ListNodes() error = %v", err)
			}
			t.Logf("ListNodes() got = %v", nodeList)
		})
	}
}
