package claims

import (
	"fmt"
	"testing"
)

func TestClaimData_SwitchToAccountData(t *testing.T) {
	type args struct {
		data *AccountClaimData
	}
	tests := []struct {
		name    string
		c       ClaimData
		args    args
		wantErr bool
	}{
		{
			name: "test",
			c: ClaimData{
				"amount": 100,
			},
			args: args{
				data: &AccountClaimData{},
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
		data *ClusterClaimData
	}
	tests := []struct {
		name    string
		c       ClaimData
		args    args
		wantErr bool
	}{
		{
			name: "test",
			c: ClaimData{
				"amount": 100,
			},
			args: args{
				data: &ClusterClaimData{},
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
