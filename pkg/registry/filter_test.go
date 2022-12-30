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

package registry

import (
	"reflect"
	"testing"
)

func TestFilter_Validate(t *testing.T) {
	tests := []struct {
		name    string
		fields  *Filter
		wantErr bool
	}{
		{
			name:    "default",
			fields:  newFilter(""),
			wantErr: false,
		},
		{
			name:    "name",
			fields:  newFilter("name=<none>"),
			wantErr: true,
		},
		{
			name:    "name-prefix",
			fields:  newFilter("name=aa*"),
			wantErr: false,
		},
		{
			name:    "name-suffix",
			fields:  newFilter("name=*cccc"),
			wantErr: false,
		},
		{
			name:    "name-error",
			fields:  newFilter("name=ccc*cccc"),
			wantErr: true,
		},
		{
			name:    "name-eque",
			fields:  newFilter("name=cccc"),
			wantErr: false,
		},
		{
			name:    "name-default1",
			fields:  newFilter("name=*"),
			wantErr: false,
		},
		{
			name:    "name-default2",
			fields:  newFilter("name="),
			wantErr: false,
		},

		{
			name:    "tag",
			fields:  newFilter("tag=<none>"),
			wantErr: false,
		},
		{
			name:    "tag-prefix",
			fields:  newFilter("tag=aa*"),
			wantErr: false,
		},
		{
			name:    "tag-suffix",
			fields:  newFilter("tag=*cccc"),
			wantErr: false,
		},
		{
			name:    "tag-error",
			fields:  newFilter("tag=ccc*cccc"),
			wantErr: true,
		},
		{
			name:    "tag-default1",
			fields:  newFilter("tag=*"),
			wantErr: false,
		},
		{
			name:    "tag-default2",
			fields:  newFilter("tag="),
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := tt.fields
			if err := f.Validate(); (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestFilter_Run(t *testing.T) {
	type args struct {
		data []string
		t    FilterType
	}
	tests := []struct {
		name   string
		fields *Filter
		args   args
		want   []string
	}{
		{
			name:   "default",
			fields: newFilter("name=a"),
			args: args{
				data: []string{"a", "b", "c"},
				t:    FilterTypeName,
			},
			want: []string{"a"},
		},
		{
			name:   "default",
			fields: newFilter("name=c*"),
			args: args{
				data: []string{"abcc", "bdcff", "c"},
				t:    FilterTypeName,
			},
			want: []string{"c"},
		},
		{
			name:   "default",
			fields: newFilter("name=*labring*"),
			args: args{
				data: []string{"labring/lvscare"},
				t:    FilterTypeName,
			},
			want: []string{"labring/lvscare"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := tt.fields
			if err := f.Validate(); err != nil {
				t.Error(err)
				return
			}
			if got := f.Run(tt.args.data, tt.args.t); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Run() = %v, want %v", got, tt.want)
			}
		})
	}
}
