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
				//8379fbf9aa583dcc5d7f3193e5ad9923
				p: &v1beta1.Resource{
					Spec: v1beta1.ResourceSpec{
						Type: v1beta1.KubernetesTarGz,
						Path: "/Users/cuisongliu/DockerImages/kube1.22.0-amd64.tar.gz",
					},
					Status: v1beta1.ResourceStatus{Path: "/var/lib/sealos/resource/sha256:a8862375805f4feed24984d479fa56e0c812ddedc4f2fddb8489550acb08847d"},
				},
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := NewStore()
			if err := s.Save(tt.args.p); (err != nil) != tt.wantErr {
				t.Errorf("tarGz() error = %v, wantErr %v", err, tt.wantErr)
			}
			t.Logf("struct is %+v", tt.args.p)
		})
	}
}
