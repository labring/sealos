/*
Copyright 2022 cuisongliu@qq.com.

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

package registry

import (
	"testing"

	"github.com/docker/docker/api/types"
)

func TestDefaultImage_ListRegistry(t *testing.T) {
	type fields struct {
		auths map[string]types.AuthConfig
	}
	tests := []struct {
		name   string
		fields fields
	}{
		{
			name: "default",
			fields: fields{
				auths: map[string]types.AuthConfig{
					"192.168.64.29:5000": {
						Username: "admin",
						Password: "passw0rd",
					},
				},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			is := &DefaultImage{
				auths: tt.fields.auths,
			}
			is.Status(false)
		})
	}
}

func TestDefaultImage_ListImages(t *testing.T) {
	type fields struct {
		auths map[string]types.AuthConfig
	}
	type args struct {
		registryName string
	}
	tests := []struct {
		name   string
		fields fields
		args   args
	}{
		{
			name: "default",
			fields: fields{
				auths: map[string]types.AuthConfig{
					"123.57.131.24:5000": {
						Username: "admin",
						Password: "passw0rd",
					},
				},
			},
			args: args{
				registryName: "123.57.131.24:5000",
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			is := &DefaultImage{
				auths: tt.fields.auths,
			}
			is.ListImages(tt.args.registryName, "name=*,tag=<none>", false)
		})
	}
}
