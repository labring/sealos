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

package maps

import (
	"fmt"
	"reflect"
	"testing"
)

func TestMergeMap(t *testing.T) {
	type args struct {
		dst map[string]string
		src map[string]string
	}
	tests := []struct {
		name string
		args args
		want map[string]string
	}{
		{
			name: "default",
			args: args{
				dst: map[string]string{
					"aa": "cc",
				},
				src: map[string]string{
					"aa": "bb",
				},
			},
			want: map[string]string{
				"aa": "bb",
			},
		},
		{
			name: "default-add",
			args: args{
				dst: map[string]string{
					"aa": "cc",
				},
				src: map[string]string{
					"aa": "bb",
					"bb": "bb",
				},
			},
			want: map[string]string{
				"aa": "bb",
				"bb": "bb",
			},
		},
		{
			name: "default-replace",
			args: args{
				dst: map[string]string{
					"aa": "bb",
					"bb": "bb",
				},
				src: map[string]string{
					"bb": "dd",
				},
			},
			want: map[string]string{
				"aa": "bb",
				"bb": "dd",
			},
		},
		{
			name: "default-delete",
			args: args{
				dst: map[string]string{
					"aa": "bb",
					"bb": "bb",
				},
				src: map[string]string{
					"cc": "cc",
				},
			},
			want: map[string]string{
				"aa": "bb",
				"bb": "bb",
				"cc": "cc",
			},
		},
		{
			name: "default-delete-dest",
			args: args{
				dst: map[string]string{},
				src: map[string]string{
					"cc": "cc",
				},
			},
			want: map[string]string{
				"cc": "cc",
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data := Merge(tt.args.dst, tt.args.src)
			if !reflect.DeepEqual(data, tt.want) {
				t.Errorf("MergeMap() = %v, want %v", data, tt.want)
			}
		})
	}
}

func TestStringToMap(_ *testing.T) {
	data := FromString("address=reg.real-ai.cn,auth=xxx", ",")
	fmt.Println(data["address"])
}
