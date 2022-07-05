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

func Test_splitDockerDomain(t *testing.T) {
	tests := []struct {
		name       string
		imageName  string
		wantDomain string
		wantRemain string
	}{
		{
			name:       "test1",
			imageName:  "quay.io/tigera/operator:v1.25.3",
			wantDomain: "quay.io",
			wantRemain: "library/alpine:latest",
		},
		{
			name:       "test2",
			imageName:  "ubuntu",
			wantDomain: defaultDomain,
			wantRemain: "library/ubuntu",
		},
		{
			name:       "test3",
			imageName:  "k8s.gcr.io/kube-apiserver",
			wantDomain: "k8s.gcr.io",
			wantRemain: "kube-apiserver",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if domain, remainer := splitDockerDomain(tt.imageName); domain != tt.wantDomain || remainer != tt.wantRemain {
				t.Errorf("split image %s error", tt.name)
			}
		})
	}
}

func Test_parseNormalizedNamed(t *testing.T) {
	tests := []struct {
		name       string
		imageName  string
		wantDomain string
		wantRepo   string
		wantTag    string
	}{
		{
			name:       "test1",
			imageName:  "docker.io/library/alpine:latest",
			wantDomain: defaultDomain,
			wantRepo:   "library/alpine",
			wantTag:    defaultTag,
		},
		{
			name:       "test2",
			imageName:  "ubuntu",
			wantDomain: defaultDomain,
			wantRepo:   "library/ubuntu",
			wantTag:    defaultTag,
		},
		{
			name:       "test3",
			imageName:  "k8s.gcr.io/kube-apiserver",
			wantDomain: "k8s.gcr.io",
			wantRepo:   "kube-apiserver",
			wantTag:    defaultTag,
		},
		{
			name:       "test4",
			imageName:  "fanux/lvscare",
			wantDomain: defaultDomain,
			wantRepo:   "fanux/lvscare",
			wantTag:    defaultTag,
		},
		{
			name:       "test5",
			imageName:  "alpine",
			wantDomain: defaultDomain,
			wantRepo:   "library/alpine",
			wantTag:    defaultTag,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if named, err := ParseNormalizedNamed(tt.imageName); err != nil || named.Domain() != tt.wantDomain || named.Repo() != tt.wantRepo || named.tag != tt.wantTag {
				t.Errorf("parse image %s error", tt.name)
			}
		})
	}
}

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
