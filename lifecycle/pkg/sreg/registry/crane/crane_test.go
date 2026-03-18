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

package crane

import (
	"github.com/docker/docker/api/types/registry"
	"path/filepath"
	"testing"
)

func TestGetImageDigestFromAuth(t *testing.T) {
	t.Setenv("DOCKER_CONFIG", filepath.Join("testdata"))
	type args struct {
		image      string
		authConfig map[string]registry.AuthConfig
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "",
			args: args{
				image:      "cuisongliu/alpine:dlv",
				authConfig: nil,
			},
			wantErr: false,
		},
		{
			name: "",
			args: args{
				image:      "cuisongliu/alpine@sha256:190ba1723ba8062867ea51afd52c4d485a31ebf18d5968e8b6aebafdf64e5d86",
				authConfig: nil,
			},
			wantErr: false,
		},
		{
			name: "",
			args: args{
				image:      "nginx@sha256:2982b930fa3a93a57bd4666311665f9cf681d8e46145c07f1b5d2007968150c3",
				authConfig: nil,
			},
			wantErr: false,
		},
		{
			name: "",
			args: args{
				image: "registry.k8s.io/etcd:3.5.1-0",
				authConfig: map[string]registry.AuthConfig{"sealos.hub:5000": {
					Username:      "admin",
					Password:      "passw0rd",
					ServerAddress: "http://sealos.hub:5000",
				}},
			},
			wantErr: false,
		},
		{
			name: "",
			args: args{
				image: "registry.k8s.io/etcd:3.5.1-1",
				authConfig: map[string]registry.AuthConfig{"sealos.hub:5000": {
					Username:      "admin",
					Password:      "passw0rd",
					ServerAddress: "http://sealos.hub:5000",
				}},
			},
			wantErr: true,
		},
		{
			name: "",
			args: args{
				image: "registry.k8s.io/etcd@sha256:64b9ea357325d5db9f8a723dcf503b5a449177b17ac87d69481e126bb724c263",
				authConfig: map[string]registry.AuthConfig{"sealos.hub:5000": {
					Username:      "admin",
					Password:      "passw0rd",
					ServerAddress: "http://sealos.hub:5000",
				}},
			},
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			newImage, got, _, err := GetImageManifestFromAuth(tt.args.image, tt.args.authConfig)
			t.Logf("GetImageManifestFromAuth() newImage = %v", newImage)
			if (err != nil) != tt.wantErr {
				t.Errorf("GetImageManifestFromAuth() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			t.Logf("GetImageManifestFromAuth() got = %s", string(got))
		})
	}
}
