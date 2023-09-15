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

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"
)

func TestDriver_GetInstances(t *testing.T) {
	type args struct {
		key    string
		value  string
		infra  *v1.Infra
		status string
	}
	tests := []struct {
		name    string
		args    args
		want    *v1.Hosts
		wantErr bool
	}{
		{
			"test get instance",
			args{
				key:    "master",
				value:  "true",
				status: "running",
				infra: &v1.Infra{
					TypeMeta: metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{
						Name:      "sealos-infra",
						Namespace: "sealos-infra-ns",
						UID:       "b5919c2f-969b-47fd-b9a1-d8d36c28049a",
					},
					Spec: v1.InfraSpec{
						AvailabilityZone: "cn-hangzhou-i",
					},
				},
			},
			&v1.Hosts{
				Count: 1,
			},
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			d, err := NewDriver("aliyun")
			if err != nil {
				t.Errorf("create driver failed: %v", err)
			}
			host, err := d.GetInstances(tt.args.infra, tt.args.status)
			if (err != nil) != tt.wantErr {
				t.Errorf("GetInstances() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			fmt.Println("got hosts: ", host[0].Metadata)
		})
	}
}
