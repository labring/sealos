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

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func Test_jsonUnmarshal(t *testing.T) {
	type args struct {
		path string
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		// TODO: Add test cases.
		{
			name: "default",
			args: args{
				path: "/var/lib/sealos/resource/sha256:29490abb48c65e824ebc9cdee908e92b15c3e916a3bbcbc1f104af3114a1b5bf/kube/system.json",
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := jsonUnmarshal(tt.args.path)
			if (err != nil) != tt.wantErr {
				t.Errorf("jsonUnmarshal() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			t.Logf("%+v", got)
			ts, _, _ := unstructured.NestedString(got, "CNI", "Type")
			t.Logf("%+v", ts)
		})
	}
}
