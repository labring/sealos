// Copyright © 2021 Alibaba Group Holding Ltd.
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

package buildimage

import (
	"reflect"
	"testing"
)

func TestParseYamlImages(t *testing.T) {
	data, err := ParseYamlImages("/Users/cuisongliu/Workspaces/go/src/github.com/sealyun/cloud-kernel/runtime/cni/31901/etc")
	if err != nil {
		t.Errorf(err.Error())
		return
	}
	t.Logf("%v", data)
}

func TestFilter(t *testing.T) {
	type args struct {
		images     []string
		ignoreFile string
	}
	tests := []struct {
		name    string
		args    args
		want    []string
		wantErr bool
	}{
		{
			name: "filter",
			args: args{
				images:     []string{"docker.io/cilium/istio_proxy", "quay.io/cilium/cilium:v1.12.0", "quay.io/cilium/operator-generic:v1.12.0"},
				ignoreFile: "test/ignore/.sealignore",
			},
			want:    []string{"docker.io/cilium/istio_proxy", "quay.io/cilium/cilium:v1.12.0"},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Filter(tt.args.images, tt.args.ignoreFile)
			if (err != nil) != tt.wantErr {
				t.Errorf("Filter() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Filter() got = %v, want %v", got, tt.want)
			}
		})
	}
}
