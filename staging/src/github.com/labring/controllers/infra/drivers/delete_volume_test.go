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
)

func TestDriver_deleteVolumes(t *testing.T) {
	type args struct {
		disksID []string
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			"test delete volume",
			args{
				[]string{"d-bp1ds373gmumyeoxj149", "d-bp1g8yzs1qf3rt8nx33k"},
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
			if err := d.DeleteVolume(tt.args.disksID); (err != nil) != tt.wantErr {
				t.Errorf("DeleteVolume() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
