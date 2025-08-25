// Copyright © 2021 Alibaba Group Holding Ltd.
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

package config

import (
	"bytes"
	"os"
	"testing"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/file"
)

func TestDumper_Dump(t *testing.T) {
	type fields struct {
		configs     []v1beta1.Config
		clusterName string
	}
	type args struct {
		clusterfile string
	}
	tests := []struct {
		name    string
		fields  fields
		args    args
		wantErr bool
	}{
		{
			"test dump clusterfile configs",
			fields{
				configs:     nil,
				clusterName: "my-cluster",
			},
			args{clusterfile: "test_clusterfile.yaml"},
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := NewDefaultConfiguration(tt.fields.clusterName)
			if err := c.Dump(); (err != nil) != tt.wantErr {
				t.Errorf("Dump() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func Test_NewConfiguration_Dump(t *testing.T) {
	type fields struct {
		configs  []v1beta1.Config
		name     string
		rootPath string
		origin   string
		expect   string
	}
	filename := "test.yaml"
	tests := []struct {
		name    string
		fields  fields
		wantErr bool
	}{
		{
			"test dump clusterfile configs",
			fields{
				configs: []v1beta1.Config{
					{
						TypeMeta: metav1.TypeMeta{
							Kind:       "Config",
							APIVersion: "apps.sealos.io/v1beta1",
						},
						Spec: v1beta1.ConfigSpec{
							Strategy: v1beta1.Merge,
							Path:     filename,
							Match:    "dockerhub.tencentcloudcr.com/labring/calico:v3.24.1",
							Data:     "config:\n  test: true",
						},
					},
				},
				name:     "dockerhub.tencentcloudcr.com/labring/calico:v3.24.1",
				rootPath: "./",
				origin:   "config:\n  test: false\n",
				expect:   "config:\n  test: true\n",
			},
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := file.AtomicWriteFile(filename, []byte(tt.fields.origin), 0644); err != nil {
				t.Errorf("failed to write file %v", err)
			}
			c := NewConfiguration(tt.fields.name, tt.fields.rootPath, tt.fields.configs)
			if err := c.Dump(); (err != nil) != tt.wantErr {
				t.Errorf("Dump() error = %v, wantErr %v", err, tt.wantErr)
			}
			b, _ := file.ReadAll(filename)
			if string(b) != tt.fields.expect {
				t.Errorf("unexpected merge result, %s != %s", string(b), tt.fields.expect)
			}
			_ = os.Remove(filename)
		})
	}
}

func Test_getMergeConfig(t *testing.T) {
	type args struct {
		path string
		data []byte
	}
	tests := []struct {
		name    string
		args    args
		want    []byte
		wantErr bool
	}{
		{
			name: "test",
			args: args{
				data: []byte("spec:\n  image: kubernetes:v1.19.8"),
				path: "test_clusterfile.yaml",
			},
		}, {
			name: "test",
			args: args{
				data: []byte("spec:\n  template:\n    metadata:\n      labels:\n        name: tigera-operatorssssss"),
				path: "tigera-operator.yaml",
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := getMergeConfigData(tt.args.path, tt.args.data)
			if err != nil {
				t.Error(err)
				return
			}
			err = os.WriteFile("test_"+tt.args.path, got, 0644)
			if err != nil {
				t.Error(err)
			}
		})
	}
}

func Test_getAppendOrInsertConfigData(t *testing.T) {
	type args struct {
		path   string
		data   []byte
		insert bool
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "default",
			args: args{
				path:   "test_clusterfile.yaml",
				data:   []byte("---\naa: cc\n---"),
				insert: false,
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := getAppendOrInsertConfigData(tt.args.path, tt.args.data, tt.args.insert)
			if (err != nil) != tt.wantErr {
				t.Errorf("getAppendOrInsertConfigData() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			t.Log(string(got))
		})
	}
}

func Test_getOverrideConfig(t *testing.T) {
	type args struct {
		path string
		data []byte
	}
	tests := []struct {
		name    string
		args    args
		want    []byte
		wantErr bool
	}{
		{
			name: "test",
			args: args{
				data: []byte("spec:\n  image: kubernetes:v1.19.8"),
				path: "test_clusterfile.yaml",
			},
		}, {
			name: "test",
			args: args{
				data: []byte("spec:\n  template:\n    metadata:\n      labels:\n        name: tigera-operatorssssss"),
				path: "tigera-operator.yaml",
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.args.data

			output := "test_" + tt.args.path
			err := os.WriteFile(output, got, 0644)
			if err != nil {
				t.Error(err)
			}

			content, err := os.ReadFile(output)
			if err != nil {
				t.Error(err)
			}
			if !bytes.Equal(tt.args.data, content) {
				t.Errorf("getOverrideConfigData() failed, expect %v, got %v", tt.args.data, content)
			}
		})
	}
}
