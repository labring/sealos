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

package crane

import (
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/docker/docker/api/types"
)

func TestNewRegistry(t *testing.T) {
	t.Setenv("DOCKER_CONFIG", filepath.Join("testdata"))
	type args struct {
		domain     string
		authConfig types.AuthConfig
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "sealos.hub",
			args: args{
				domain: "sealos.hub:5000",
				authConfig: types.AuthConfig{
					Username: "admin",
					Password: "passw0rd",
				},
			},
			wantErr: false,
		},
		{
			name: "sealos.hub",
			args: args{
				domain: "http://sealos.hub:5000",
				authConfig: types.AuthConfig{
					Username: "admin",
					Password: "passw0rd",
				},
			},
			wantErr: false,
		},
		{
			name: "sealos.hub",
			args: args{
				domain: "sealos.hub",
				authConfig: types.AuthConfig{
					Username: "admin",
					Password: "passw0rd",
				},
			},
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := NewRegistry(tt.args.domain, tt.args.authConfig)
			if (err != nil) != tt.wantErr {
				t.Errorf("NewRegistry() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			t.Logf("NewRegistry() got = %v", got)
		})
	}
}

func TestGetAuthInfo(t *testing.T) {
	t.Run("no credentials found", func(t *testing.T) {
		authConfigs, err := GetAuthInfo(nil)
		require.NoError(t, err)
		require.Empty(t, authConfigs)
	})
	t.Run("has credentials found", func(t *testing.T) {
		t.Setenv("DOCKER_CONFIG", filepath.Join("testdata"))
		authConfigs, err := GetAuthInfo(nil)
		require.NoError(t, err)
		require.NotEmpty(t, authConfigs)
		t.Logf("%+v", authConfigs)
	})
}
