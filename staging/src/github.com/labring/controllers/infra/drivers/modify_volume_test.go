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

func TestDriver_modifyVolume(t *testing.T) {
	type args struct {
		curDisk *v1.Disk
		desDisk *v1.Disk
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			"test modify volume",
			args{
				curDisk: &v1.Disk{
					ID:         []string{"d-bp1db3ueezr56lk2xewv"},
					VolumeType: "cloud_essd",
					Capacity:   40,
					//Name:     "/dev/sda2",
				},
				desDisk: &v1.Disk{
					VolumeType: "cloud_auto",
					Capacity:   40,
					//Name:     "/dev/sda2",
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
			if err := d.ModifyVolume(tt.args.curDisk, tt.args.desDisk); (err != nil) != tt.wantErr {
				t.Errorf("createInstances() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
