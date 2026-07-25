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
	"reflect"
	"testing"
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
			want:    []string{"docker.io/cilium/istio_proxy", "quay.io/cilium/cilium:v1.12.0", "quay.io/cilium/operator-generic:v1.12.0"},
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
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("ParseChartImages() got = %v, want %v", got, tt.want)
			}
		})
	}
}
