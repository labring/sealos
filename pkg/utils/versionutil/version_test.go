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
package versionutil

import "testing"

func TestCompare(t *testing.T) {
	type args struct {
		v1 string
		v2 string
	}
	tests := []struct {
		name string
		args args
		want bool
	}{
		{
			name: "v1 greater than v2",
			args: args{
				v1: "v1.25.2",
				v2: "v1.25.1",
			},
			want: true,
		}, {
			name: "v1 less than v2",
			args: args{
				v1: "v1.25.8",
				v2: "v1.25.10",
			},
			want: false,
		},
		{
			name: "v1 equal v2",
			args: args{
				v1: "v1.25.8",
				v2: "v1.25.8",
			},
			want: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Compare(tt.args.v1, tt.args.v2); got != tt.want {
				t.Errorf("Compare() = %v, want %v", got, tt.want)
			}
		})
	}
}
