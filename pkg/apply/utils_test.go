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

package apply

import "testing"

func TestPreProcessIPList(t *testing.T) {
	type args struct {
		joinArgs *Cluster
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "node",
			args: args{
				joinArgs: &Cluster{
					Masters:     "",
					Nodes:       "192.168.1.1",
					ClusterName: "",
				},
			},
			wantErr: false,
		},
		{
			name: "master",
			args: args{
				joinArgs: &Cluster{
					Masters:     "192.168.1.1",
					Nodes:       "",
					ClusterName: "",
				},
			},
			wantErr: false,
		},
		{
			name: "node list",
			args: args{
				joinArgs: &Cluster{
					Masters:     "",
					Nodes:       "192.168.1.1,192.168.1.2,192.168.1.5",
					ClusterName: "",
				},
			},
			wantErr: false,
		},
		{
			name: "master list",
			args: args{
				joinArgs: &Cluster{
					Masters:     "192.168.1.1,192.168.1.2,192.168.1.5",
					Nodes:       "",
					ClusterName: "",
				},
			},
			wantErr: false,
		},
		{
			name: "node range",
			args: args{
				joinArgs: &Cluster{
					Masters:     "",
					Nodes:       "192.168.1.1-192.168.1.5",
					ClusterName: "",
				},
			},
			wantErr: false,
		},
		{
			name: "master range",
			args: args{
				joinArgs: &Cluster{
					Masters:     "192.168.1.1-192.168.1.5",
					Nodes:       "",
					ClusterName: "",
				},
			},
			wantErr: false,
		},
		{
			name: "node cidr",
			args: args{
				joinArgs: &Cluster{
					Masters:     "",
					Nodes:       "192.168.1.1/28",
					ClusterName: "",
				},
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := PreProcessIPList(tt.args.joinArgs); (err != nil) != tt.wantErr {
				t.Errorf("PreProcessIPList() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestIsIPList(t *testing.T) {
	tests := []struct {
		name string
		args string
		want bool
	}{
		{
			name: "single",
			args: "192.168.1.1",
			want: true,
		},
		{
			name: "multi",
			args: "192.168.1.2",
			want: true,
		},
		{
			name: "single with port",
			args: "192.168.1.1:22",
			want: true,
		},
		{
			name: "multi with port",
			args: "192.168.1.1:22,192.168.1.2:22",
			want: true,
		},
		{
			name: "invalid",
			args: "xxxx",
			want: false,
		},
		{
			name: "invalid with port",
			args: "xxxx:xx",
			want: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if ok := IsIPList(tt.args); ok != tt.want {
				t.Errorf("IsIPList() = %v, want %v", ok, tt.want)
			}
		})
	}
}
