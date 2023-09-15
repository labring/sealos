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
	"fmt"
	"testing"

	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"
)

func TestPrice_QueryPrice(t *testing.T) {
	hosts := []v1.Hosts{
		{
			Roles:  []string{"master"},
			Count:  2,
			Flavor: string(types.InstanceTypeT2Medium),
			Image:  "ami-05248307900d52e3a",
			Disks: []v1.Disk{
				{
					Type:     string(types.VolumeTypeGp3),
					Capacity: 35,
					//Name:     "/dev/sda2",
				},
			},
		},
		{
			Roles:  []string{"node"},
			Count:  2,
			Flavor: string(types.InstanceTypeT2Medium),
			Image:  "ami-05248307900d52e3a",
			Disks: []v1.Disk{
				{
					Type:     string(types.VolumeTypeGp2),
					Capacity: 20,
					//Name:     "/dev/sda2",
				},
			},
		},
	}

	infra := &v1.Infra{
		TypeMeta: metav1.TypeMeta{},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "sealos-infra",
			Namespace: "sealos-infra-ns",
		},
	}
	infra.Spec.Hosts = hosts

	type args struct {
		infra *v1.Infra
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			"test for query infra price/hour",
			args{
				infra: infra,
			},
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			value, err := infra.QueryPrice()
			if (err != nil) != tt.wantErr {
				t.Errorf("QueryPrice() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			fmt.Println("value:", value)
		})
	}
}
