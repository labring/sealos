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

package env

import (
	"testing"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

func getShimCluster1() *v2.Cluster {
	return &v2.Cluster{
		Spec: v2.ClusterSpec{
			Env: []string{"registryDomain=sealos.hub", "registryPort=5000", "registryUsername=admin", "registryPassword=passw0rd"},
			Hosts: []v2.Host{
				{
					IPS:   []string{"192.168.0.2", "192.168.0.3", "192.168.0.4"},
					Roles: []string{"master"},
					Env:   []string{},
				},
			},
			SSH: v2.SSH{},
		},
		Status: v2.ClusterStatus{
			Mounts: []v2.MountImage{
				{
					Name:       "",
					Type:       v2.RootfsImage,
					ImageName:  "",
					MountPoint: "",
					Env:        nil,
					Labels: map[string]string{
						v2.ImageKubeVersionKey: "v1.26.0",
					},
					Cmd:        nil,
					Entrypoint: nil,
				},
			},
		},
	}
}
func getShimCluster2() *v2.Cluster {
	return &v2.Cluster{
		Spec: v2.ClusterSpec{
			Env: []string{"registryDomain=sealos.hub", "registryPort=5000", "registryUsername=admin", "registryPassword=passw0rd"},
			Hosts: []v2.Host{
				{
					IPS:   []string{"192.168.0.2", "192.168.0.3", "192.168.0.4"},
					Roles: []string{"master"},
					Env:   []string{},
				},
			},
			SSH: v2.SSH{},
		},
		Status: v2.ClusterStatus{
			Mounts: []v2.MountImage{
				{
					Name:       "",
					Type:       v2.RootfsImage,
					ImageName:  "",
					MountPoint: "",
					Env:        nil,
					Labels: map[string]string{
						v2.ImageKubeVersionKey: "v1.25.0",
					},
					Cmd:        nil,
					Entrypoint: nil,
				},
			},
		},
	}
}
func getShimCluster3() *v2.Cluster {
	return &v2.Cluster{
		Spec: v2.ClusterSpec{
			Env: []string{"registryDomain=sealos.hub", "registryPort=5000", "registryUsername=admin", "registryPassword=passw0rd"},
			Hosts: []v2.Host{
				{
					IPS:   []string{"192.168.0.2", "192.168.0.3", "192.168.0.4"},
					Roles: []string{"master"},
					Env:   []string{},
				},
			},
			SSH: v2.SSH{},
		},
	}
}

func Test_shim_RenderAll(t *testing.T) {
	type fields struct {
		Cluster *v2.Cluster
	}
	type args struct {
		host string
		dir  string
	}
	tests := []struct {
		name    string
		fields  fields
		args    args
		wantErr bool
	}{
		{
			"test 126",
			fields{getShimCluster1()},
			args{
				host: "192.168.0.2",
				dir:  "test/shim",
			},
			false,
		},
		{
			"test 125",
			fields{getShimCluster2()},
			args{
				host: "192.168.0.2",
				dir:  "test/shim",
			},
			false,
		},
		{
			"test no version",
			fields{getShimCluster3()},
			args{
				host: "192.168.0.2",
				dir:  "test/shim",
			},
			false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p := &processor{
				Cluster: tt.fields.Cluster,
				cache:   make(map[string]map[string]string),
			}
			if err := p.RenderAll(tt.args.host, tt.args.dir, map[string]string{}); (err != nil) != tt.wantErr {
				t.Errorf("RenderAll() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
