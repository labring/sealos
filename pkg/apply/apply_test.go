/*
Copyright 2023 cuisongliu@qq.com.

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
	"reflect"
	"testing"

	"github.com/labring/sealos/pkg/apply/applydrivers"
)

func Test_NewApplierFromFile(t *testing.T) {
	type args struct {
		customEnv []string
		sets      []string
		values    []string
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "success",
			args: args{
				customEnv: []string{
					"SSH_PASSWORD=s3cret",
				},
				sets: []string{
					"clusterName=default",
				},
				values: []string{"../clusterfile/testdata/example.values.yaml"},
			},
			wantErr: false,
		},
		{
			name: "fail",
			args: args{
				customEnv: []string{
					"SSH_PASSWORD=s3cret",
				},
				sets: []string{
					"clusterName=''",
				},
				values: []string{"../clusterfile/testdata/example.values.yaml"},
			},
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := NewApplierFromFile("../clusterfile/testdata/clusterfile.yaml",
				&Args{
					Values:    tt.args.values,
					Sets:      tt.args.sets,
					CustomEnv: tt.args.customEnv,
				})
			t.Log(err)
			if (err != nil) != tt.wantErr {
				t.Errorf("NewApplierFromFile(string, ...OptionFunc) error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestNewApplierFromFile(t *testing.T) {
	type args struct {
		path string
		args *Args
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
			got, err := NewApplierFromFile(tt.args.path, tt.args.args)
			if (err != nil) != tt.wantErr {
				t.Errorf("NewApplierFromFile() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("NewApplierFromFile() got = %v, want %v", got, tt.want)
			}
		})
	}
}
