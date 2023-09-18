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

package buildah

import (
	"testing"

	"github.com/spf13/cobra"
)

func Test_realImpl_InspectImage(t *testing.T) {
	type args struct {
		name string
		opts []string
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "local-0",
			args: args{
				name: "docker.io/labring/kubernetes:v1.25.3",
				opts: nil,
			},
			wantErr: false,
		},
		{
			name: "local-1",
			args: args{
				name: "containers-storage:docker.io/labring/kubernetes:v1.25.3",
				opts: nil,
			},
			wantErr: false,
		},
		{
			name: "local-2",
			args: args{
				name: "cd5271889c3b",
				opts: nil,
			},
			wantErr: false,
		},
		{
			name: "remote-0",
			args: args{
				name: "docker://docker.io/labring/kubernetes:v1.25.3",
				opts: nil,
			},
			wantErr: false,
		},
		{
			name: "remote-1",
			args: args{
				name: "docker.io/labring/kubernetes:v1.25.3",
				opts: []string{"docker"},
			},
			wantErr: false,
		},
		{
			name: "remote-0-new",
			args: args{
				name: "docker://docker.io/labring/kubernetes:v1.25.4",
				opts: nil,
			},
			wantErr: false,
		},
		{
			name: "remote-1-new",
			args: args{
				name: "docker.io/labring/kubernetes:v1.25.4",
				opts: []string{"docker"},
			},
			wantErr: false,
		},
		{
			name: "tar-oci",
			args: args{
				name: "/home/cuisongliu/Downloads/hello-world-oci.tar",
				opts: []string{"oci-archive"},
			},
			wantErr: false,
		},
		{
			name: "tar-docker",
			args: args{
				name: "/home/cuisongliu/Downloads/hello-world.tar",
				opts: []string{"docker-archive"},
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			root := &cobra.Command{
				Use:   "test",
				Short: "test",
			}
			//storage-driver
			RegisterRootCommand(root)
			impl, err := New("")
			if err != nil {
				t.Errorf("%+v", err)
				return
			}
			got, err := impl.InspectImage(tt.args.name, tt.args.opts...)
			if (err != nil) != tt.wantErr {
				t.Errorf("InspectImage() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			t.Logf("%+v", got)
		})
	}
}
