// Copyright © 2023 sealos.
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

package crypto

import "testing"

func TestRechargeBalance(t *testing.T) {
	type args struct {
		rawBalance *string
		amount     int64
	}
	a := ""
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "test1",
			args: args{
				rawBalance: &a,
				amount:     100,
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := RechargeBalance(tt.args.rawBalance, tt.args.amount); (err != nil) != tt.wantErr {
				t.Errorf("RechargeBalance() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
