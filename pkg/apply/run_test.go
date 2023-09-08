// Copyright © 2022 sealos.
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

package apply

import (
	"reflect"
	"testing"

	"github.com/spf13/cobra"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/ssh"
	"github.com/labring/sealos/pkg/utils/iputils"

	"github.com/labring/sealos/pkg/apply/applydrivers"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

func TestClusterArgs_SetClusterRunArgs(t *testing.T) {
	type fields struct {
		cluster     *v2.Cluster
		hosts       []v2.Host
		clusterName string
	}
	type args struct {
		imageList []string
		runArgs   *RunArgs
	}
	tests := []struct {
		name    string
		fields  fields
		args    args
		wantErr bool
	}{
		// TODO: Add test cases.
		{
			name: "success",
			fields: fields{
				cluster: &v2.Cluster{
					ObjectMeta: metav1.ObjectMeta{
						CreationTimestamp: metav1.Time{},
					},
					Spec: v2.ClusterSpec{
						SSH: v2.SSH{},
					},
				},
				hosts:       []v2.Host{},
				clusterName: "default",
			},
			args: args{
				imageList: []string{
					"registry.cn-hangzhou.aliyuncs.com/sealyun/kube-apiserver:v1.19.9",
					"registry.cn-hangzhou.aliyuncs.com/sealyun/kube-scheduler:v1.19.9",
				},
				runArgs: &RunArgs{
					Cluster: &Cluster{
						Masters:     "192.168.1.2",
						Nodes:       "192.168.1.3",
						ClusterName: "default",
					},
					SSH: &SSH{},
					CustomEnv: []string{
						"SSH_PASSWORD=s3cret",
					},
					CustomCMD: []string{
						"echo hello",
					},
				},
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &ClusterArgs{
				cluster:     tt.fields.cluster,
				hosts:       tt.fields.hosts,
				clusterName: tt.fields.clusterName,
			}
			if err := r.runArgs(&cobra.Command{
				Use: "mock",
			}, tt.args.runArgs, tt.args.imageList); (err != nil) != tt.wantErr {
				t.Errorf("runArgs() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestClusterArgs_setHostWithIpsPort(t *testing.T) {
	type fields struct {
		cluster     *v2.Cluster
		hosts       []v2.Host
		clusterName string
	}
	type args struct {
		ips   []string
		roles []string
	}
	tests := []struct {
		name   string
		fields fields
		args   args
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &ClusterArgs{
				cluster:     tt.fields.cluster,
				hosts:       tt.fields.hosts,
				clusterName: tt.fields.clusterName,
			}
			r.setHostWithIpsPort(tt.args.ips, tt.args.roles)
		})
	}
}

func TestNewApplierFromArgs(t *testing.T) {
	addr, _ := iputils.ListLocalHostAddrs()
	Default := "Default"
	type args struct {
		imageName []string
		args      *RunArgs
	}
	tests := []struct {
		name    string
		args    args
		want    applydrivers.Interface
		wantErr bool
	}{
		// TODO: Add test cases.
		{
			name: "test set master ip in single mode",
			args: args{
				imageName: []string{"labring/kubernetes:v1.24.0"},
				args: &RunArgs{
					Cluster: &Cluster{
						Masters:     "",
						Nodes:       "",
						ClusterName: Default,
					},
				},
			},
			want: &applydrivers.Applier{
				ClusterDesired: &v2.Cluster{
					TypeMeta: metav1.TypeMeta{
						Kind:       "Cluster",
						APIVersion: v2.SchemeGroupVersion.String(),
					},
					ObjectMeta: metav1.ObjectMeta{
						Name:        Default,
						Annotations: map[string]string{},
					},
					Spec: v2.ClusterSpec{
						Hosts: []v2.Host{
							{IPS: []string{iputils.LocalIP(addr) + ":22"}, Roles: []string{v2.MASTER, GetHostArch(ssh.MustNewClient(&v2.SSH{}, true), iputils.LocalIP(addr)+":22")}},
						},
						Image: []string{"labring/kubernetes:v1.24.0"},
						SSH:   v2.SSH{},
					},
					Status: v2.ClusterStatus{},
				},
				ClusterFile:    clusterfile.NewClusterFile(constants.Clusterfile(Default)),
				ClusterCurrent: nil,
				RunNewImages:   []string{"labring/kubernetes:v1.24.0"},
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := NewApplierFromArgs(&cobra.Command{
				Use: "mock",
			}, tt.args.args, tt.args.imageName)
			if (err != nil) != tt.wantErr {
				t.Errorf("NewApplierFromArgs() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("NewApplierFromArgs() got = %v, want %v", got, tt.want)
			}
		})
	}
}
