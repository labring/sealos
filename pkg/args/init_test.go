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

package args

import (
	"testing"

	"github.com/fanux/sealos/pkg/utils/logger"

	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
)

func TestInit_SetClusterArgs(t *testing.T) {
	type fields struct {
		cluster    *v2.Cluster
		configs    []v2.Config
		hosts      []v2.ClusterHost
		dryRun     bool
		withoutCNI bool
	}
	type args struct {
		args InitArgs
	}
	tests := []struct {
		name    string
		fields  fields
		args    args
		wantErr bool
	}{
		{
			name: "default",
			fields: fields{
				cluster: initCluster("xxxx"),
			},
			args: args{
				args: InitArgs{
					Masters:    "172.16.1.2,172.16.1.25",
					Nodes:      "172.16.1.3-172.16.1.19",
					User:       "root",
					Password:   "admin",
					Port:       22,
					Pk:         "",
					PkPassword: "",
				},
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &Init{
				cluster:    tt.fields.cluster,
				configs:    tt.fields.configs,
				hosts:      tt.fields.hosts,
				dryRun:     tt.fields.dryRun,
				withoutCNI: tt.fields.withoutCNI,
				args:       tt.args.args,
			}
			if err := r.SetClusterArgs(); (err != nil) != tt.wantErr {
				t.Errorf("processCluster() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestInit_Output(t *testing.T) {
	type args struct {
		args InitArgs
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "default",
			args: args{
				args: InitArgs{
					Masters:    "192.168.64.15",
					Nodes:      "192.168.64.17",
					User:       "root",
					Pk:         v2.DefaultPKFile,
					Port:       22,
					WithoutCNI: false,
					Interface:  v2.DefaultCNIInterface,
					IPIPFalse:  false,
					MTU:        v2.DefaultCNIMTU,
					//KubeadmfilePath:  "/Users/cuisongliu/DockerImages/kube/system.yaml1",
					KubeURI:     "/Users/cuisongliu/DockerImages/kube1.22.0-amd64.tar.gz",
					ClusterName: "default",
					Vlog:        0,
					DryRun:      true,
				},
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &Init{
				args: tt.args.args,
			}
			if err := r.SetClusterArgs(); (err != nil) != tt.wantErr {
				t.Errorf("SetClusterArgs() error = %v, wantErr %v", err, tt.wantErr)
			}
			if err := r.SetResourceArgs(); (err != nil) != tt.wantErr {
				t.Errorf("SetResourceArgs() error = %v, wantErr %v", err, tt.wantErr)
			}
			logger.Cfg(true, false)
			_ = r.Output()
		})
	}
}
