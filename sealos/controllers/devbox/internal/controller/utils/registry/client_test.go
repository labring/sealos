// Copyright © 2024 sealos.
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

package registry

import "testing"

func TestClient_TagImage(t1 *testing.T) {
	type fields struct {
		Username string
		Password string
	}
	type args struct {
		hostName  string
		imageName string
		oldTag    string
		newTag    string
	}
	tests := []struct {
		name    string
		fields  fields
		args    args
		wantErr bool
	}{
		{
			name: "Test1",
			fields: fields{
				Username: "admin",
				Password: "passw0rd",
			},
			args: args{
				hostName:  "sealos.hub:5000",
				imageName: "default/devbox-sample",
				oldTag:    "2024-08-21-072021",
				newTag:    "test",
			},
		},
	}
	for _, tt := range tests {
		t1.Run(tt.name, func(t1 *testing.T) {
			t := &Client{
				Username: tt.fields.Username,
				Password: tt.fields.Password,
			}
			if err := t.TagImage(tt.args.hostName, tt.args.imageName, tt.args.oldTag, tt.args.newTag); (err != nil) != tt.wantErr {
				t1.Errorf("TagImage() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
