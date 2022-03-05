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

	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
)

func TestInit_processCluster(t *testing.T) {
	type fields struct {
		cluster           *v2.Cluster
		configs           []v2.Config
		resources         []v2.Resource
		hosts             []v2.ClusterHost
		kubeadmBashSuffix string
		dryRun            bool
		withoutCNI        bool
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
					MastersArm: "172.16.1.1",
					Nodes:      "172.16.1.3-172.16.1.19",
					NodesArm:   "172.16.1.20-172.16.1.22",
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
				cluster:           tt.fields.cluster,
				configs:           tt.fields.configs,
				resources:         tt.fields.resources,
				hosts:             tt.fields.hosts,
				kubeadmBashSuffix: tt.fields.kubeadmBashSuffix,
				dryRun:            tt.fields.dryRun,
				withoutCNI:        tt.fields.withoutCNI,
				args:              tt.args.args,
			}
			if err := r.SetClusterArgs(); (err != nil) != tt.wantErr {
				t.Errorf("processCluster() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
