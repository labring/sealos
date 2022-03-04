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

package store

import (
	"testing"

	"github.com/fanux/sealos/pkg/types/v1beta1"
)

func Test_store_tarGz(t *testing.T) {
	type fields struct {
		clusterName string
	}
	type args struct {
		p *v1beta1.Resource
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
				clusterName: "xxxx",
			},
			args: args{
				p: &v1beta1.Resource{
					Spec: v1beta1.ResourceSpec{
						Type: v1beta1.KubernetesTarGz,
						Path: "/Users/cuisongliu/DockerImages/kube1.22.0-amd64.tar.gz",
					},
				},
			},
			wantErr: false,
		},
		{
			name: "default-bin",
			fields: fields{
				clusterName: "xxxx",
			},
			args: args{
				p: &v1beta1.Resource{
					Spec: v1beta1.ResourceSpec{
						Type:     v1beta1.FileBinaryAmd64,
						Path:     "https://sealyun-temp.oss-accelerate.aliyuncs.com/sealos/3152531/sealctl",
						Override: "/opt/sealctl",
					},
				},
			},
			wantErr: false,
		},
		{
			name: "default-dir",
			fields: fields{
				clusterName: "xxxx",
			},
			args: args{
				p: &v1beta1.Resource{
					Spec: v1beta1.ResourceSpec{
						Type:     v1beta1.KubernetesDir,
						Path:     "/Users/cuisongliu/DockerImages/kube",
					},
				},
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := NewStore(tt.fields.clusterName)
			if err := s.Save(tt.args.p); (err != nil) != tt.wantErr {
				t.Errorf("tarGz() error = %v, wantErr %v", err, tt.wantErr)
			}
			t.Logf("struct is %+v", tt.args.p)
		})
	}
}
