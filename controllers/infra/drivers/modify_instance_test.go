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

func TestDriver_modifyInstance(t *testing.T) {
	type args struct {
		curHosts *v1.Hosts
		desHosts *v1.Hosts
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			"test modify volume",
			args{
				curHosts: &v1.Hosts{
					Count: 2,
					Metadata: []v1.Metadata{
						{
							ID: "i-bp1iy6p6ibt5zx69zi4p",
						},
						{
							ID: "i-bp1iy6p6ibt5zx69zi4o",
						},
					},
					Flavor: "ecs.s6-c1m1.small",
				},
				desHosts: &v1.Hosts{
					Count: 2,
					Metadata: []v1.Metadata{
						{
							ID: "i-bp1iy6p6ibt5zx69zi4p",
						},
						{
							ID: "i-bp1iy6p6ibt5zx69zi4o",
						},
					},
					Flavor: "ecs.s6-c1m2.small",
				},
			},
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			d, err := NewDriver("aliyun")
			if err != nil {
				t.Errorf("create driver failed")
			}
			if err := d.ModifyInstances(tt.args.curHosts, tt.args.desHosts); (err != nil) != tt.wantErr {
				t.Errorf("createInstances() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
