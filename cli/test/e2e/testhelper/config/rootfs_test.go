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

import (
	"os"
	"testing"
)

func TestDockerfile_Write(t *testing.T) {
	type fields struct {
		Images            []string
		KubeadmYaml       string
		BaseImage         string
		Copys             []string
		dockerfileContent string
	}
	tests := []struct {
		name    string
		fields  fields
		want    string
		wantErr bool
	}{
		{
			name: "default",
			fields: fields{
				Images: []string{"docker.io/altinity/clickhouse-operator:0.18.4", "docker.io/altinity/metrics-exporter:0.18.4"},
			},
			wantErr: false,
		},
		{
			name: "yaml",
			fields: fields{
				BaseImage:   "docker.io/labring/kubernetes:v1.18.4",
				KubeadmYaml: "testyaml",
			},
			wantErr: false,
		},
		{
			name: "copy",
			fields: fields{
				BaseImage: "docker.io/labring/kubernetes:v1.18.4",
				Copys:     []string{"/tmp/sealctl /opt/"},
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			d := &RootfsDockerfile{
				Images:            tt.fields.Images,
				KubeadmYaml:       tt.fields.KubeadmYaml,
				BaseImage:         tt.fields.BaseImage,
				Copys:             tt.fields.Copys,
				dockerfileContent: tt.fields.dockerfileContent,
			}
			got, err := d.Write()
			if (err != nil) != tt.wantErr {
				t.Errorf("Write() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			t.Log(got)
			_ = os.RemoveAll(got)
		})
	}
}
