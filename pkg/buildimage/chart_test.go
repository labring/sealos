// Copyright © 2022 sealos.
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
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseChartImages(t *testing.T) {
	type args struct {
		chartPath string
	}
	tests := []struct {
		name    string
		args    args
		want    []string
		wantErr bool
	}{
		{
			name: "chart",
			args: args{
				chartPath: "test/charts",
			},
			// want:    []string{"docker.io/cilium/istio_proxy", "quay.io/cilium/cilium:v1.12.0", "quay.io/cilium/operator-generic:v1.12.0"},
			want: []string{
				"docker.io/apache/apisix-dashboard:2.13-alpine",
				"docker.io/apache/apisix-ingress-controller:1.5.0",
				"docker.io/apache/apisix:2.15.0-alpine",
				"docker.io/bitnami/etcd:3.5.4-debian-11-r14",
				"docker.io/library/busybox:1.28",
				"docker.io/library/busybox",
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseChartImages(tt.args.chartPath)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseChartImages() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			// use elements match to compare two lists since order is not important
			assert.ElementsMatch(t, got, tt.want)
		})
	}
}
