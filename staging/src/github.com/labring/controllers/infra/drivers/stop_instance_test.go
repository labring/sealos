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

package drivers

import (
	"testing"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"
)

func TestDriver_StopInstances(t *testing.T) {
	type args struct {
		hosts *v1.Hosts
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{"test delete instance",
			args{hosts: &v1.Hosts{
				Count: 2,
				Metadata: []v1.Metadata{
					{
						IP: nil,
						// TODO this test case should get the instance id from create interface.
						ID: "i-bp1b12w8wosiidi8bz77",
					},
					{
						ID: "i-bp1b12w8wosiidi8bz76",
					},
				},
			}},
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			d, _ := NewDriver("aliyun")
			if err := d.StopInstances(tt.args.hosts); (err != nil) != tt.wantErr {
				t.Errorf("StopInstances() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
