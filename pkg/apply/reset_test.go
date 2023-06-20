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

import (
	"testing"
)

func TestNewApplierFromResetArgs(t *testing.T) {
	type args struct {
		args *ResetArgs
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "error",
			args: args{
				args: &ResetArgs{
					Cluster: &Cluster{},
					SSH:     &SSH{},
				},
			},
			wantErr: true,
		},
		{
			name: "error duplicate",
			args: args{
				args: &ResetArgs{
					Cluster: &Cluster{
						Masters:     "192.158.1.1",
						Nodes:       "192.158.1.1",
						ClusterName: "default",
					},
					SSH: &SSH{},
				},
			},
			wantErr: true,
		},
		{
			name: "success",
			args: args{
				args: &ResetArgs{
					Cluster: &Cluster{
						Masters:     "192.158.1.1",
						Nodes:       "192.158.1.2",
						ClusterName: "default",
					},
					SSH: &SSH{},
				},
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := NewApplierFromResetArgs(tt.args.args)
			if (err != nil) != tt.wantErr {
				t.Errorf("NewApplierFromResetArgs() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
		})
	}
}
