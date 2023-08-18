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

	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
	v1 "github.com/labring/sealos/controllers/infra/api/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestDriver_CreateVolumes(t *testing.T) {
	type args struct {
		infra *v1.Infra
		host  *v1.Hosts
		disks []v1.Disk
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			"test create volume",
			args{
				infra: &v1.Infra{
					TypeMeta: metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{
						Name:      "sealos-infra",
						Namespace: "sealos-infra-ns",
						UID:       "0abafc31-735b-4a9c-923f-493af2ed1b25",
					},
					Spec: v1.InfraSpec{
						AvailabilityZone: "cn-hangzhou-i",
					},
				},
				disks: []v1.Disk{{
					VolumeType: "cloud_essd",
					Capacity:   20,
					//Name:     "/dev/sda2",
				}},
				host: &v1.Hosts{
					Roles:     []string{"master"},
					Count:     1,
					Resources: nil,
					Flavor:    string(types.InstanceTypeT2Micro),
					Arch:      "",
					Image:     "ami-05248307900d52e3a",
					Disks:     nil,
					Metadata: []v1.Metadata{
						{
							ID: "i-bp1b12w8wosiidi8bz77",
						},
						{
							ID: "i-bp1b12w8wosiidi8bz76",
						},
					},
				},
			},
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			d, _ := NewDriver("aliyun")

			if err := d.CreateVolumes(tt.args.infra, tt.args.host, tt.args.disks); (err != nil) != tt.wantErr {
				t.Errorf("CreateVolumes() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
