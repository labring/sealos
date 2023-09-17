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

package guest

import (
	"fmt"
	"reflect"
	"testing"

	"github.com/labring/sealos/pkg/constants"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

func TestDefault_getGuestCmd(t *testing.T) {
	shell := func(cName, containerName, cmd string) string {
		return fmt.Sprintf(constants.CdAndExecCmd, constants.GetAppWorkDir(cName, containerName), cmd)
	}
	type fields struct {
	}
	type args struct {
		envs    map[string]string
		cluster *v2.Cluster
		mounts  []v2.MountImage
	}
	tests := []struct {
		name   string
		fields fields
		args   args
		want   []string
	}{
		{
			name:   "default",
			fields: fields{},
			args: args{
				envs:    map[string]string{},
				cluster: &v2.Cluster{Spec: v2.ClusterSpec{Command: nil}},
				mounts: []v2.MountImage{
					{
						Cmd:        []string{"IFACE=$(IFACE) bash ovn-install.sh"},
						Entrypoint: nil,
						Env:        map[string]string{"IFACE": "cccc"},
					},
				},
			},
			want: []string{shell("", "", "IFACE=cccc bash ovn-install.sh")},
		},

		{
			name:   "default-env",
			fields: fields{},
			args: args{
				envs:    map[string]string{},
				cluster: &v2.Cluster{Spec: v2.ClusterSpec{Command: nil}},
				mounts: []v2.MountImage{
					{
						Cmd:        []string{"IFACE=\"$(IFACE)\" bash ovn-install.sh"},
						Entrypoint: nil,
						Env:        map[string]string{"IFACE": "eth.*|en.*"},
					},
				},
			},
			want: []string{shell("", "", "IFACE=\"eth.*|en.*\" bash ovn-install.sh")},
		},
		{
			name:   "default-env-override",
			fields: fields{},
			args: args{
				envs:    map[string]string{"IFACE": "default"},
				cluster: &v2.Cluster{Spec: v2.ClusterSpec{Command: nil}},
				mounts: []v2.MountImage{
					{
						Cmd:        []string{"IFACE=\"$(IFACE)\" bash ovn-install.sh"},
						Entrypoint: nil,
						Env:        map[string]string{"IFACE": "eth.*|en.*"},
					},
				},
			},
			want: []string{shell("", "", "IFACE=\"default\" bash ovn-install.sh")},
		},
		{
			name:   "default-cmd-override",
			fields: fields{},
			args: args{
				envs:    map[string]string{"IFACE": "default"},
				cluster: &v2.Cluster{Spec: v2.ClusterSpec{Command: []string{"IFACE=\"$(IFACE)\" sh ovn-install.sh"}}},
				mounts: []v2.MountImage{
					{
						Cmd:        []string{"IFACE=\"$(IFACE)\" bash ovn-install.sh"},
						Entrypoint: nil,
						Env:        map[string]string{"IFACE": "eth.*|en.*"},
					},
				},
			},
			want: []string{shell("", "", "IFACE=\"default\" sh ovn-install.sh")},
		},
		{
			name:   "default-entrypoint-cmd-override",
			fields: fields{},
			args: args{
				envs:    map[string]string{"IFACE": "default"},
				cluster: &v2.Cluster{Spec: v2.ClusterSpec{Command: []string{"IFACE=\"$(IFACE)\" sh ovn-install.sh"}}},
				mounts: []v2.MountImage{
					{
						Cmd:        []string{"IFACE=\"$(IFACE)\" bash ovn-install.sh"},
						Entrypoint: []string{"AA=$(IFACE)"},
						Env:        map[string]string{"IFACE": "eth.*|en.*"},
					},
				},
			},
			want: []string{shell("", "", "AA=default"), shell("", "", "IFACE=\"default\" sh ovn-install.sh")},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			for i := range tt.args.mounts {
				if got := formalizeImageCommands(tt.args.cluster, i, tt.args.mounts[i], tt.args.envs); !reflect.DeepEqual(got, tt.want) {
					t.Errorf("getGuestCmd() = %v, want %v", got, tt.want)
				}
			}
		})
	}
}

func TestDefault_getGuestCmd_dollarBraceVariable(t *testing.T) {
	shell := func(cName, containerName, cmd string) string {
		return fmt.Sprintf(constants.CdAndExecCmd, constants.GetAppWorkDir(cName, containerName), cmd)
	}
	type fields struct {
	}
	type args struct {
		envs    map[string]string
		cluster *v2.Cluster
		mounts  []v2.MountImage
	}
	tests := []struct {
		name   string
		fields fields
		args   args
		want   []string
	}{
		{
			name:   "default",
			fields: fields{},
			args: args{
				envs:    map[string]string{},
				cluster: &v2.Cluster{Spec: v2.ClusterSpec{Command: nil}},
				mounts: []v2.MountImage{
					{
						Cmd:        []string{"IFACE=${IFACE} bash ovn-install.sh"},
						Entrypoint: nil,
						Env:        map[string]string{"IFACE": "cccc"},
					},
				},
			},
			want: []string{shell("", "", "IFACE=cccc bash ovn-install.sh")},
		},

		{
			name:   "default-env",
			fields: fields{},
			args: args{
				envs:    map[string]string{},
				cluster: &v2.Cluster{Spec: v2.ClusterSpec{Command: nil}},
				mounts: []v2.MountImage{
					{
						Cmd:        []string{"IFACE=\"${IFACE}\" bash ovn-install.sh"},
						Entrypoint: nil,
						Env:        map[string]string{"IFACE": "eth.*|en.*"},
					},
				},
			},
			want: []string{shell("", "", "IFACE=\"eth.*|en.*\" bash ovn-install.sh")},
		},
		{
			name:   "default-env-override",
			fields: fields{},
			args: args{
				envs:    map[string]string{"IFACE": "default"},
				cluster: &v2.Cluster{Spec: v2.ClusterSpec{Command: nil}},
				mounts: []v2.MountImage{
					{
						Cmd:        []string{"IFACE=\"${IFACE}\" bash ovn-install.sh"},
						Entrypoint: nil,
						Env:        map[string]string{"IFACE": "eth.*|en.*"},
					},
				},
			},
			want: []string{shell("", "", "IFACE=\"default\" bash ovn-install.sh")},
		},
		{
			name:   "default-cmd-override",
			fields: fields{},
			args: args{
				envs:    map[string]string{"IFACE": "default"},
				cluster: &v2.Cluster{Spec: v2.ClusterSpec{Command: []string{"IFACE=\"${IFACE}\" sh ovn-install.sh"}}},
				mounts: []v2.MountImage{
					{
						Cmd:        []string{"IFACE=\"${IFACE}\" bash ovn-install.sh"},
						Entrypoint: nil,
						Env:        map[string]string{"IFACE": "eth.*|en.*"},
					},
				},
			},
			want: []string{shell("", "", "IFACE=\"default\" sh ovn-install.sh")},
		},
		{
			name:   "default-entrypoint-cmd-override",
			fields: fields{},
			args: args{
				envs:    map[string]string{"IFACE": "default"},
				cluster: &v2.Cluster{Spec: v2.ClusterSpec{Command: []string{"IFACE=\"${IFACE}\" sh ovn-install.sh"}}},
				mounts: []v2.MountImage{
					{
						Cmd:        []string{"IFACE=\"${IFACE}\" bash ovn-install.sh"},
						Entrypoint: []string{"AA=${IFACE}"},
						Env:        map[string]string{"IFACE": "eth.*|en.*"},
					},
				},
			},
			want: []string{shell("", "", "AA=default"), shell("", "", "IFACE=\"default\" sh ovn-install.sh")},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			for i := range tt.args.mounts {
				if got := formalizeImageCommands(tt.args.cluster, i, tt.args.mounts[i], tt.args.envs); !reflect.DeepEqual(got, tt.want) {
					t.Errorf("getGuestCmd() = %v, want %v", got, tt.want)
				}
			}
		})
	}
}

func TestDefault_getGuestCmd_dollarVariable(t *testing.T) {
	shell := func(cName, containerName, cmd string) string {
		return fmt.Sprintf(constants.CdAndExecCmd, constants.GetAppWorkDir(cName, containerName), cmd)
	}
	type fields struct {
	}
	type args struct {
		envs    map[string]string
		cluster *v2.Cluster
		mounts  []v2.MountImage
	}
	tests := []struct {
		name   string
		fields fields
		args   args
		want   []string
	}{
		{
			name:   "default",
			fields: fields{},
			args: args{
				envs:    map[string]string{},
				cluster: &v2.Cluster{Spec: v2.ClusterSpec{Command: nil}},
				mounts: []v2.MountImage{
					{
						Cmd:        []string{"IFACE=$IFACE bash ovn-install.sh"},
						Entrypoint: nil,
						Env:        map[string]string{"IFACE": "cccc"},
					},
				},
			},
			want: []string{shell("", "", "IFACE=cccc bash ovn-install.sh")},
		},

		{
			name:   "default-env",
			fields: fields{},
			args: args{
				envs:    map[string]string{},
				cluster: &v2.Cluster{Spec: v2.ClusterSpec{Command: nil}},
				mounts: []v2.MountImage{
					{
						Cmd:        []string{"IFACE=\"$IFACE\" bash ovn-install.sh"},
						Entrypoint: nil,
						Env:        map[string]string{"IFACE": "eth.*|en.*"},
					},
				},
			},
			want: []string{shell("", "", "IFACE=\"eth.*|en.*\" bash ovn-install.sh")},
		},
		{
			name:   "default-env-override",
			fields: fields{},
			args: args{
				envs:    map[string]string{"IFACE": "default"},
				cluster: &v2.Cluster{Spec: v2.ClusterSpec{Command: nil}},
				mounts: []v2.MountImage{
					{
						Cmd:        []string{"IFACE=\"$IFACE\" bash ovn-install.sh"},
						Entrypoint: nil,
						Env:        map[string]string{"IFACE": "eth.*|en.*"},
					},
				},
			},
			want: []string{shell("", "", "IFACE=\"default\" bash ovn-install.sh")},
		},
		{
			name:   "default-cmd-override",
			fields: fields{},
			args: args{
				envs:    map[string]string{"IFACE": "default"},
				cluster: &v2.Cluster{Spec: v2.ClusterSpec{Command: []string{"IFACE=\"$IFACE\" sh ovn-install.sh"}}},
				mounts: []v2.MountImage{
					{
						Cmd:        []string{"IFACE=\"$IFACE\" bash ovn-install.sh"},
						Entrypoint: nil,
						Env:        map[string]string{"IFACE": "eth.*|en.*"},
					},
				},
			},
			want: []string{shell("", "", "IFACE=\"default\" sh ovn-install.sh")},
		},
		{
			name:   "default-entrypoint-cmd-override",
			fields: fields{},
			args: args{
				envs:    map[string]string{"IFACE": "default"},
				cluster: &v2.Cluster{Spec: v2.ClusterSpec{Command: []string{"IFACE=\"$IFACE\" sh ovn-install.sh"}}},
				mounts: []v2.MountImage{
					{
						Cmd:        []string{"IFACE=\"$IFACE\" bash ovn-install.sh"},
						Entrypoint: []string{"AA=$IFACE"},
						Env:        map[string]string{"IFACE": "eth.*|en.*"},
					},
				},
			},
			want: []string{shell("", "", "AA=default"), shell("", "", "IFACE=\"default\" sh ovn-install.sh")},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			for i := range tt.args.mounts {
				if got := formalizeImageCommands(tt.args.cluster, i, tt.args.mounts[i], tt.args.envs); !reflect.DeepEqual(got, tt.want) {
					t.Errorf("getGuestCmd() = %v, want %v", got, tt.want)
				}
			}
		})
	}
}
