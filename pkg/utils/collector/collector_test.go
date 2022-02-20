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

package collector

import (
	"testing"
)

func TestNewCollector(t *testing.T) {
	type args struct {
		src      string
		savepath string
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "wget",
			args: args{
				src:      "https://sealyun-temp.oss-accelerate.aliyuncs.com/sealos/3152531/sealctl",
				savepath: "/tmp/sealos/temp",
			},
			wantErr: false,
		},
		{
			name: "local",
			args: args{
				src:      "utils.go",
				savepath: "/tmp/sealos/temp",
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := NewCollector(tt.args.src)
			if (err != nil) != tt.wantErr {
				t.Errorf("NewCollector() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			err = got.Collect(".", tt.args.src, tt.args.savepath)
			if (err != nil) != tt.wantErr {
				t.Errorf("Collect() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
		})
	}
}
