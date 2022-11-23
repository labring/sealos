package controllers

import (
	"testing"

	infrav1 "github.com/labring/sealos/controllers/infra/api/v1"

	v1 "github.com/labring/sealos/controllers/cluster/api/v1"
)

func Test_generateClusterfile(t *testing.T) {
	type args struct {
		infra   *infrav1.Infra
		cluster *v1.Cluster
	}
	tests := []struct {
		name    string
		args    args
		want    string
		wantErr bool
	}{
		{
			"test for generate clusterfile",
			args{},
			"",
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := generateClusterfile(tt.args.infra, tt.args.cluster)
			if (err != nil) != tt.wantErr {
				t.Errorf("generateClusterfile() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("generateClusterfile() got = %v, want %v", got, tt.want)
			}
		})
	}
}
