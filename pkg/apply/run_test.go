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

	"github.com/spf13/pflag"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

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
					fs: pflag.NewFlagSet("test", pflag.ExitOnError),
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
			if err := r.runArgs(tt.args.imageList, tt.args.runArgs); (err != nil) != tt.wantErr {
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
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := NewApplierFromArgs(tt.args.imageName, tt.args.args)
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
