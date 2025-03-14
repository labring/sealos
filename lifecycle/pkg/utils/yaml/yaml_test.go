// Copyright © 2025 sealos.
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

package yaml

import (
	"bytes"
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"sigs.k8s.io/yaml"
)

type testStruct struct {
	Name string `yaml:"name"`
	Age  int    `yaml:"age"`
}

func TestUnmarshalStrict(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		obj     interface{}
		wantErr bool
	}{
		{
			name:  "valid yaml",
			input: "name: test\nage: 20",
			obj:   &testStruct{},
		},
		{
			name:    "not a pointer",
			input:   "name: test",
			obj:     testStruct{},
			wantErr: true,
		},
		{
			name:    "not a struct pointer",
			input:   "name: test",
			obj:     new(string),
			wantErr: true,
		},
		{
			name:  "empty yaml",
			input: "",
			obj:   &testStruct{},
		},
		{
			name:  "only whitespace",
			input: "   \n   ",
			obj:   &testStruct{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reader := strings.NewReader(tt.input)
			err := unmarshalStrict(reader, tt.obj)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestUnmarshalToMap(t *testing.T) {
	tests := []struct {
		name    string
		input   []byte
		want    map[string]interface{}
		wantErr bool
	}{
		{
			name:  "valid yaml",
			input: []byte("name: test\nage: 20"),
			want: map[string]interface{}{
				"name": "test",
				"age":  float64(20),
			},
		},
		{
			name:    "invalid yaml",
			input:   []byte("invalid: :\nyaml"),
			wantErr: true,
		},
		{
			name:  "empty yaml",
			input: []byte(""),
			want:  map[string]interface{}(nil),
		},
		{
			name:  "only whitespace",
			input: []byte("   \n   "),
			want:  map[string]interface{}(nil),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := UnmarshalToMap(tt.input)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestToJSON(t *testing.T) {
	tests := []struct {
		name  string
		input []byte
		want  []string
	}{
		{
			name:  "valid yaml",
			input: []byte(`{"name": "test"}`),
			want:  []string{`{"name":"test"}`},
		},
		{
			name: "multiple documents",
			input: []byte(`name: test1
age: 20
---
name: test2
age: 30`),
			want: []string{`{"name":"test1","age":20}`, `{"name":"test2","age":30}`},
		},
		{
			name:  "empty input",
			input: []byte(""),
			want:  nil,
		},
		{
			name:  "invalid yaml",
			input: []byte("invalid: :\nyaml"),
			want:  nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ToJSON(tt.input)
			assert.Equal(t, len(tt.want), len(got), "JSON array lengths don't match")
			if len(tt.want) == len(got) {
				for i := range tt.want {
					// Compare JSON strings after normalizing
					var gotObj, wantObj interface{}
					assert.NoError(t, yaml.Unmarshal([]byte(got[i]), &gotObj))
					assert.NoError(t, yaml.Unmarshal([]byte(tt.want[i]), &wantObj))
					assert.Equal(t, wantObj, gotObj)
				}
			}
		})
	}
}

func TestMarshal(t *testing.T) {
	tests := []struct {
		name    string
		input   interface{}
		wantErr bool
	}{
		{
			name: "valid struct",
			input: testStruct{
				Name: "test",
				Age:  20,
			},
		},
		{
			name:    "nil input",
			input:   nil,
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data, err := Marshal(tt.input)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
			if tt.input != nil {
				var decoded testStruct
				err = yaml.Unmarshal(data, &decoded)
				assert.NoError(t, err)
				assert.Equal(t, tt.input, decoded)
			}
		})
	}
}

func TestMarshalFile(t *testing.T) {
	tmpfile, err := os.CreateTemp("", "test*.yaml")
	assert.NoError(t, err)
	defer os.Remove(tmpfile.Name())

	tests := []struct {
		name    string
		obj     interface{}
		wantErr bool
	}{
		{
			name: "valid object",
			obj: testStruct{
				Name: "test",
				Age:  20,
			},
		},
		{
			name:    "nil object",
			obj:     nil,
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := MarshalFile(tmpfile.Name(), tt.obj)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)

			if tt.obj != nil {
				content, err := os.ReadFile(tmpfile.Name())
				assert.NoError(t, err)
				var decoded testStruct
				err = yaml.Unmarshal(content, &decoded)
				assert.NoError(t, err)
				assert.Equal(t, tt.obj, decoded)
			}
		})
	}
}

func TestUnmarshal(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		obj     interface{}
		wantErr bool
	}{
		{
			name:  "valid yaml",
			input: "name: test\nage: 20",
			obj:   &testStruct{},
		},
		{
			name:    "invalid yaml",
			input:   "invalid: :\nyaml",
			obj:     &testStruct{},
			wantErr: true,
		},
		{
			name:    "nil object",
			input:   "name: test",
			obj:     nil,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.obj == nil {
				assert.Panics(t, func() {
					_ = Unmarshal(strings.NewReader(tt.input), tt.obj)
				})
				return
			}
			err := Unmarshal(strings.NewReader(tt.input), tt.obj)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
			if ts, ok := tt.obj.(*testStruct); ok {
				assert.Equal(t, "test", ts.Name)
				assert.Equal(t, 20, ts.Age)
			}
		})
	}
}

func TestIsNil(t *testing.T) {
	tests := []struct {
		name    string
		input   []byte
		want    bool
		wantErr bool
	}{
		{
			name:  "empty map",
			input: []byte("{}"),
			want:  true,
		},
		{
			name:  "non-empty map",
			input: []byte("key: value"),
			want:  false,
		},
		{
			name:    "invalid yaml",
			input:   []byte("invalid:\n\t:yaml"),
			wantErr: true,
		},
		{
			name:  "empty input",
			input: []byte(""),
			want:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := IsNil(tt.input)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestUnmarshalFile(t *testing.T) {
	tmpfile, err := os.CreateTemp("", "test*.yaml")
	assert.NoError(t, err)
	defer os.Remove(tmpfile.Name())

	tests := []struct {
		name    string
		content []byte
		obj     interface{}
		wantErr bool
	}{
		{
			name:    "valid yaml",
			content: []byte("name: test\nage: 20"),
			obj:     &testStruct{},
		},
		{
			name:    "invalid yaml",
			content: []byte("invalid: :\nyaml"),
			obj:     &testStruct{},
			wantErr: true,
		},
		{
			name:    "empty file",
			content: []byte(""),
			obj:     &testStruct{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := os.WriteFile(tmpfile.Name(), tt.content, 0644)
			assert.NoError(t, err)

			err = UnmarshalFile(tmpfile.Name(), tt.obj)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
			if len(tt.content) > 0 {
				ts := tt.obj.(*testStruct)
				assert.Equal(t, "test", ts.Name)
				assert.Equal(t, 20, ts.Age)
			}
		})
	}
}

func TestMarshalConfigs(t *testing.T) {
	tests := []struct {
		name    string
		configs []interface{}
		wantErr bool
	}{
		{
			name: "multiple configs",
			configs: []interface{}{
				testStruct{Name: "test1", Age: 20},
				testStruct{Name: "test2", Age: 30},
			},
		},
		{
			name:    "empty configs",
			configs: []interface{}{},
		},
		{
			name: "single config",
			configs: []interface{}{
				testStruct{Name: "test", Age: 20},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data, err := MarshalConfigs(tt.configs...)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)

			if len(tt.configs) > 0 {
				parts := bytes.Split(data, []byte("\n---\n"))
				assert.Equal(t, len(tt.configs), len(parts))

				for i, config := range tt.configs {
					var decoded testStruct
					err = yaml.Unmarshal(parts[i], &decoded)
					assert.NoError(t, err)
					assert.Equal(t, config, decoded)
				}
			}
		})
	}
}
