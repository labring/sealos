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
		resources  []v2.Resource
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
				resources:  tt.fields.resources,
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
					Masters: "192.168.64.15",
					//Nodes:            "172.16.1.3-172.16.1.19",
					User:             "root",
					Password:         "admin",
					Port:             22,
					PodCidr:          v2.DefaultPodCIDR,
					SvcCidr:          v2.DefaultSvcCIDR,
					APIServerDomain:  v2.DefaultAPIServerDomain,
					VIP:              v2.DefaultVIP,
					CertSANS:         []string{},
					WithoutCNI:       false,
					Interface:        v2.DefaultCNIInterface,
					IPIPFalse:        false,
					MTU:              v2.DefaultCNIMTU,
					RegistryDomain:   "sealos.hub",
					RegistryPort:     5000,
					CRIData:          v2.DefaultCRIData,
					RegistryConfig:   v2.DefaultRegistryConfig,
					RegistryData:     v2.DefaultRegistryData,
					RegistryUsername: "admin",
					RegistryPassword: "passw0rd",
					KubeadmfilePath:  "/Users/cuisongliu/DockerImages/kube/system.yaml1",
					KubeURI:          "/Users/cuisongliu/DockerImages/kube1.22.0-amd64.tar.gz",
					//Arm64URI:         "/Users/cuisongliu/DockerImages/kube1.22.0-amd64.tar.gz",
					CtlURI: "/Users/cuisongliu/Workspaces/go/src/github.com/fanux/sealos/dist/sealctl_darwin_amd64/sealctl",
					//CTLArm64URI:      "https://sealyun-temp.oss-accelerate.aliyuncs.com/sealos/3152531/sealctl",
					ClusterName: "default",
					Vlog:        0,
					DryRun:      false,
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
			if err := r.SetConfigArgs(); (err != nil) != tt.wantErr {
				t.Errorf("SetConfigArgs() error = %v, wantErr %v", err, tt.wantErr)
			}
			logger.Cfg(true, false)
			_ = r.Output()
		})
	}
}
