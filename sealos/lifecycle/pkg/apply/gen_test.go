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

package apply

import (
	"testing"

	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/buildah"
)

func TestNewClusterFromGenArgs(t *testing.T) {
	type args struct {
		imageName []string
		args      *RunArgs
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "default",
			args: args{
				imageName: []string{"docker.io/labring/kubernetes:v1.25.3"},
				args: &RunArgs{
					Cluster: &Cluster{
						Masters:     "172.16.1.35",
						Nodes:       "",
						ClusterName: "default",
					},
					SSH:               nil,
					CustomEnv:         nil,
					CustomCMD:         nil,
					CustomConfigFiles: nil,
				},
			},
			wantErr: false,
		},
		{
			name: "Success_EmptyHostsAndSSH",
			args: args{
				imageName: []string{"docker.io/labring/kubernetes:v1.25.3"},
				args: &RunArgs{
					Cluster: &Cluster{
						Masters:     "",
						Nodes:       "",
						ClusterName: "default",
					},
					SSH:               nil,
					CustomEnv:         nil,
					CustomCMD:         nil,
					CustomConfigFiles: nil,
				},
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		buildah.RegisterRootCommand(&cobra.Command{
			Use:   "test",
			Short: "test",
		})
		t.Run(tt.name, func(t *testing.T) {
			got, _ := NewClusterFromGenArgs(&cobra.Command{
				Use: "mock",
			}, tt.args.args, tt.args.imageName)
			t.Logf("%s", string(got))
		})
	}
}

func Test_genImageInfo(t *testing.T) {
	type args struct {
		imageName []string
	}
	tests := []struct {
		name string
		args args
	}{
		{
			name: "default",
			args: args{imageName: []string{"docker.io/labring/kubernetes:v1.25.3"}},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			buildah.RegisterRootCommand(&cobra.Command{
				Use:   "test",
				Short: "test",
			})
			got, _ := genImageInfo(tt.args.imageName[0])
			t.Logf("%+v", got)
		})
	}
}
