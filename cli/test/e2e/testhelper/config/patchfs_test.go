/*
Copyright 2023 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package config

import "testing"

func TestPatchDockerfile_Write(t *testing.T) {
	type fields struct {
		Images            []string
		dockerfileContent string
		Copys             []string
		Cmds              []string
	}
	tests := []struct {
		name    string
		fields  fields
		wantErr bool
	}{
		{
			name: "default",
			fields: fields{
				Images: []string{"nginx"},
				Copys:  []string{"/tmp/sealctl /opt/"},
				Cmds:   []string{"bash upgrade.sh", "bash init.sh"},
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			d := &PatchDockerfile{
				Images:            tt.fields.Images,
				dockerfileContent: tt.fields.dockerfileContent,
				Copys:             tt.fields.Copys,
				Cmds:              tt.fields.Cmds,
			}
			got, err := d.Write()
			if (err != nil) != tt.wantErr {
				t.Errorf("Write() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			t.Logf("out dir is %s", got)
		})
	}
}
