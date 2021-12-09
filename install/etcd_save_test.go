// Copyright © 2021 sealos.
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

package install

import (
	"fmt"
	"testing"
	"time"
)

func Test_reFormatHostToIp(t *testing.T) {
	type args struct {
		host string
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{"test", args{"192.168.0.22:22"}, "192.168.0.22"},
		{"test02", args{"192.168.0.22"}, "192.168.0.22"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := reFormatHostToIP(tt.args.host); got != tt.want {
				t.Errorf("reFormatHostToIp() = %v, want %v", got, tt.want)
			}
		})
	}

	u := fmt.Sprintf("%v", time.Now().Unix())
	fmt.Println(u)
}
