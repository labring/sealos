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

func TestDriver_deleteKeyPair(t *testing.T) {
	type args struct {
		infra *v1.Infra
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			"test delete keypair",
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
						SSH: v1beta1.SSH{
							PkName: "infra-0abafc31-735b-4a9c-923f-493af2ed1b25",
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
				t.Errorf("create driver failed: %v", err)
			}
			err = d.DeleteKeyPair(tt.args.infra)
			if (err != nil) != tt.wantErr {
				t.Errorf("DeleteKeypair() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
		})
	}
}
