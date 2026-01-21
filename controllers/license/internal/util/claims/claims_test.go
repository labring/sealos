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

package claims

import (
	"testing"
)

func TestClaimData_SwitchToClusterData(t *testing.T) {
	type args struct {
		data *ClusterClaimData
	}
	tests := []struct {
		name    string
		c       ClaimData
		args    args
		wantErr bool
		want    ClusterClaimData
	}{
		{
			name: "test",
			c: ClaimData{
				"nodeCount":   3,
				"totalCPU":    6,
				"totalMemory": 12,
				"userCount":   5,
			},
			args: args{
				data: &ClusterClaimData{},
			},
			wantErr: false,
			want: ClusterClaimData{
				NodeCount:   3,
				TotalCPU:    6,
				TotalMemory: 12,
				UserCount:   5,
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := tt.c.SwitchToClusterData(tt.args.data); (err != nil) != tt.wantErr {
				t.Errorf("SwitchToClusterData() error = %v, wantErr %v", err, tt.wantErr)
			}
			if !tt.wantErr && *tt.args.data != tt.want {
				t.Fatalf("SwitchToClusterData() got = %+v, want = %+v", *tt.args.data, tt.want)
			}
		})
	}
}
