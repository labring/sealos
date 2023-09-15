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

	"github.com/labring/sealos/pkg/types/v1beta1"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"
)

func TestDriver_createInstances(t *testing.T) {
	type args struct {
		hosts *v1.Hosts
		infra *v1.Infra
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			"test create instance",
			args{
				hosts: &v1.Hosts{
					Roles:     []string{"master"},
					Count:     2,
					Resources: nil,
					Flavor:    "ecs.s6-c1m1.small",
					Arch:      "",
					Image:     "centos_7_9_x64_20G_alibase_20230109.vhd",
					Disks: []v1.Disk{
						{
							Capacity:   20,
							Type:       "root",
							VolumeType: "cloud_essd",
						},
						{
							Capacity:   20,
							Type:       "data",
							VolumeType: "cloud_essd",
						},
						{
							Capacity:   20,
							Type:       "data",
							VolumeType: "cloud_essd",
						},
					},
					Metadata: nil,
				},
				infra: &v1.Infra{
					TypeMeta: metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{
						Name:      "sealos-infra",
						Namespace: "sealos-infra-ns",
						UID:       "0abafc31-735b-4a9c-923f-493af2ed1b25",
					},
					Spec: v1.InfraSpec{
						SSH: v1beta1.SSH{
							PkName: "infra-test",
						},
					},
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
			if err := d.CreateInstances(tt.args.hosts, tt.args.infra); (err != nil) != tt.wantErr {
				t.Errorf("createInstances() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
