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
	"reflect"
	"testing"
)

func TestToString(t *testing.T) {
	tests := []struct {
		name string
		data map[string]string
		sep  string
		want string
	}{
		{
			name: "empty map",
			data: map[string]string{},
			sep:  ",",
			want: "",
		},
		{
			name: "single key-value",
			data: map[string]string{"key": "value"},
			sep:  ",",
			want: "key=value",
		},
		{
			name: "multiple key-values",
			data: map[string]string{
				"key1": "value1",
				"key2": "value2",
			},
			sep:  ";",
			want: "key1=value1;key2=value2",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ToString(tt.data, tt.sep); got != tt.want {
				t.Errorf("ToString() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestFromString(t *testing.T) {
	tests := []struct {
		name string
		data string
		sep  string
		want map[string]string
	}{
		{
			name: "empty string",
			data: "",
			sep:  ",",
			want: map[string]string{},
		},
		{
			name: "single key-value",
			data: "key=value",
			sep:  ",",
			want: map[string]string{"key": "value"},
		},
		{
			name: "multiple key-values",
			data: "key1=value1,key2=value2",
			sep:  ",",
			want: map[string]string{
				"key1": "value1",
				"key2": "value2",
			},
		},
		{
			name: "invalid format",
			data: "invalid,key=value",
			sep:  ",",
			want: map[string]string{"key": "value"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := FromString(tt.data, tt.sep); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("FromString() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestFromSlice(t *testing.T) {
	tests := []struct {
		name string
		data []string
		want map[string]string
	}{
		{
			name: "empty slice",
			data: []string{},
			want: map[string]string{},
		},
		{
			name: "valid key-values",
			data: []string{"key1=value1", "key2=value2"},
			want: map[string]string{
				"key1": "value1",
				"key2": "value2",
			},
		},
		{
			name: "invalid entries",
			data: []string{"invalid", "key=value", ""},
			want: map[string]string{"key": "value"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := FromSlice(tt.data); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("FromSlice() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestMerge(t *testing.T) {
	type args struct {
		ms []map[string]string
	}
	tests := []struct {
		name string
		args args
		want map[string]string
	}{
		{
			name: "empty maps",
			args: args{
				ms: []map[string]string{},
			},
			want: map[string]string{},
		},
		{
			name: "single map",
			args: args{
				ms: []map[string]string{
					{"key": "value"},
				},
			},
			want: map[string]string{"key": "value"},
		},
		{
			name: "multiple maps",
			args: args{
				ms: []map[string]string{
					{"key1": "value1"},
					{"key2": "value2"},
					{"key1": "newvalue"},
				},
			},
			want: map[string]string{
				"key1": "newvalue",
				"key2": "value2",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Merge(tt.args.ms...); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Merge() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestDeepMerge(t *testing.T) {
	tests := []struct {
		name string
		dst  map[string]interface{}
		src  map[string]interface{}
		want map[string]interface{}
	}{
		{
			name: "simple merge",
			dst: map[string]interface{}{
				"key1": "value1",
				"key2": map[string]interface{}{
					"nested": "old",
				},
			},
			src: map[string]interface{}{
				"key2": map[string]interface{}{
					"nested": "new",
				},
			},
			want: map[string]interface{}{
				"key1": "value1",
				"key2": map[string]interface{}{
					"nested": "new",
				},
			},
		},
		{
			name: "nested merge",
			dst: map[string]interface{}{
				"level1": map[string]interface{}{
					"level2": map[string]interface{}{
						"key": "old",
					},
				},
			},
			src: map[string]interface{}{
				"level1": map[string]interface{}{
					"level2": map[string]interface{}{
						"key": "new",
					},
				},
			},
			want: map[string]interface{}{
				"level1": map[string]interface{}{
					"level2": map[string]interface{}{
						"key": "new",
					},
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			DeepMerge(&tt.dst, &tt.src)
			if !reflect.DeepEqual(tt.dst, tt.want) {
				t.Errorf("DeepMerge() = %v, want %v", tt.dst, tt.want)
			}
		})
	}
}

func TestGetFromKeys(t *testing.T) {
	m := map[string]string{
		"key1": "value1",
		"key2": "value2",
		"key3": "",
	}

	tests := []struct {
		name string
		keys []string
		want string
	}{
		{
			name: "first key exists",
			keys: []string{"key1", "key2"},
			want: "value1",
		},
		{
			name: "second key exists",
			keys: []string{"missing", "key2"},
			want: "value2",
		},
		{
			name: "no keys exist",
			keys: []string{"missing1", "missing2"},
			want: "",
		},
		{
			name: "empty value",
			keys: []string{"key3"},
			want: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := GetFromKeys(m, tt.keys...); got != tt.want {
				t.Errorf("GetFromKeys() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestSetKeys(t *testing.T) {
	tests := []struct {
		name  string
		m     map[string]string
		keys  []string
		value string
		want  map[string]string
	}{
		{
			name:  "empty map",
			m:     map[string]string{},
			keys:  []string{"key1", "key2"},
			value: "value",
			want: map[string]string{
				"key1": "value",
				"key2": "value",
			},
		},
		{
			name: "existing keys",
			m: map[string]string{
				"key1": "old",
				"key3": "keep",
			},
			keys:  []string{"key1", "key2"},
			value: "new",
			want: map[string]string{
				"key1": "new",
				"key2": "new",
				"key3": "keep",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SetKeys(tt.m, tt.keys, tt.value); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("SetKeys() = %v, want %v", got, tt.want)
			}
		})
	}
}
