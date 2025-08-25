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
	"strings"
	"testing"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

func getTestCluster() *v2.Cluster {
	return &v2.Cluster{
		Spec: v2.ClusterSpec{
			Env: []string{"IP=127.0.0.1", "key=value"},
			Hosts: []v2.Host{
				{
					IPS:   []string{"192.168.0.2", "192.168.0.3", "192.168.0.4"},
					Roles: []string{"master"},
					Env:   []string{"key=bar", "foo=bar xxx ddd fffff", "IP=127.0.0.2"},
				},
			},
			SSH: v2.SSH{},
		},
	}
}

func Test_processor_WrapperShell(t *testing.T) {
	type fields struct {
		Cluster *v2.Cluster
	}
	type args struct {
		host  string
		shell string
	}
	tests := []struct {
		name   string
		fields fields
		args   args
		want   []string
	}{
		{
			"test command ENV",
			fields{Cluster: getTestCluster()},
			args{
				host:  "192.168.0.2",
				shell: "echo $foo ${IP[@]}",
			},
			[]string{
				"IP=\"127.0.0.2\"",
				"key=\"bar\"",
				"foo=\"bar xxx ddd fffff\"",
				"echo $foo ${IP[@]}",
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p := &processor{
				Cluster: tt.fields.Cluster,
				cache:   make(map[string]map[string]string),
			}
			got := p.WrapShell(tt.args.host, tt.args.shell)
			for _, want := range tt.want {
				if !strings.Contains(got, want) {
					t.Errorf("WrapperShell() = %v, want %v", got, want)
				}
			}
		})
	}
}

func Test_processor_RenderAll(t *testing.T) {
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
			"test render dir",
			fields{getTestCluster()},
			args{
				host: "192.168.0.2",
				dir:  "test/template",
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
			if err := p.RenderAll(tt.args.host, tt.args.dir, nil); (err != nil) != tt.wantErr {
				t.Errorf("RenderAll() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
