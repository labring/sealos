// Copyright © 2022 sealos.
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

package buildimage

import (
	"testing"
)

func TestChart_getImage(t *testing.T) {
	type fields struct {
		File string
		Path string
	}
	type args struct {
		aaa string
	}
	tests := []struct {
		name   string
		fields fields
		args   args
		want   string
	}{
		{
			name: "success",
			args: args{
				"- image: quay.io/cilium/operator-generic:v1.11.0@sha256:b522279577d0d5f1ad7cadaacb7321d1b172d8ae8c8bc816e503c897b420cfe3",
			},
			want: "quay.io/cilium/operator-generic:v1.11.0",
		},
		{
			name: "success",
			args: args{
				`image: "quay.io/cilium/cilium:v1.11.0@sha256:ea677508010800214b0b5497055f38ed3bff57963fa2399bcb1c69cf9476453a"`,
			},
			want: "quay.io/cilium/cilium:v1.11.0",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := Chart{
				File: tt.fields.File,
				Path: tt.fields.Path,
			}
			if got := c.getImage(tt.args.aaa); got != tt.want {
				t.Errorf("getImage() = %v, want %v", got, tt.want)
			}
		})
	}
}
