// Copyright © 2021 sealos.
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

import (
	"reflect"
	"testing"

	"github.com/distribution/distribution/v3/configuration"
	"github.com/docker/docker/api/types"
)

func Test_authConfigToProxy(t *testing.T) {
	type args struct {
		auth types.AuthConfig
	}
	tests := []struct {
		name string
		args args
		want configuration.Proxy
	}{
		{
			name: "nil",
			args: args{auth: types.AuthConfig{
				Username:      "",
				Password:      "",
				Auth:          "",
				ServerAddress: "",
			}},
			want: configuration.Proxy{
				RemoteURL: defaultProxyURL,
				Username:  "",
				Password:  "",
			},
		},
		{
			name: "docker.io",
			args: args{auth: types.AuthConfig{
				Username:      "",
				Password:      "",
				Auth:          "",
				ServerAddress: "docker.io",
			}},
			want: configuration.Proxy{
				RemoteURL: defaultProxyURL,
				Username:  "",
				Password:  "",
			},
		},
		{
			name: "auth",
			args: args{auth: types.AuthConfig{
				Username:      "",
				Password:      "",
				Auth:          "YWRtaW46YWRtaW4=",
				ServerAddress: "docker.io",
			}},
			want: configuration.Proxy{
				RemoteURL: defaultProxyURL,
				Username:  "admin",
				Password:  "admin",
			},
		},
		{
			name: "auth-password",
			args: args{auth: types.AuthConfig{
				Username:      "admin",
				Password:      "",
				ServerAddress: "docker.io",
			}},
			want: configuration.Proxy{
				RemoteURL: defaultProxyURL,
				Username:  "admin",
				Password:  "",
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := authConfigToProxy(tt.args.auth); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("authConfigToProxy() = %v, want %v", got, tt.want)
			}
		})
	}
}
