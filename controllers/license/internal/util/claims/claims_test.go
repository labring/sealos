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

package claims_test

import (
	"fmt"
	"testing"

	"github.com/labring/sealos/controllers/license/internal/util/claims"
)

func TestClaimData_SwitchToAccountData(t *testing.T) {
	type args struct {
		data *claims.AccountClaimData
	}
	tests := []struct {
		name    string
		c       claims.ClaimData
		args    args
		wantErr bool
	}{
		{
			name: "test",
			c: claims.ClaimData{
				"amount": 100,
			},
			args: args{
				data: &claims.AccountClaimData{},
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := tt.c.SwitchToAccountData(tt.args.data); (err != nil) != tt.wantErr {
				t.Errorf("SwitchToAccountData() error = %v, wantErr %v", err, tt.wantErr)
			}
			fmt.Printf("%v", tt.args.data)
		})
	}
}

func TestClaimData_SwitchToClusterData(t *testing.T) {
	type args struct {
		data *claims.ClusterClaimData
	}
	tests := []struct {
		name    string
		c       claims.ClaimData
		args    args
		wantErr bool
	}{
		{
			name: "test",
			c: claims.ClaimData{
				"amount": 100,
			},
			args: args{
				data: &claims.ClusterClaimData{},
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := tt.c.SwitchToClusterData(tt.args.data); (err != nil) != tt.wantErr {
				t.Errorf("SwitchToClusterData() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
