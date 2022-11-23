package controllers

import (
	"testing"

	infrav1 "github.com/labring/sealos/controllers/infra/api/v1"

	v1 "github.com/labring/sealos/controllers/cluster/api/v1"
	"github.com/labring/sealos/controllers/cluster/applier"
	"github.com/labring/sealos/controllers/infra/drivers"
	ctrl "sigs.k8s.io/controller-runtime"
)

func TestClusterReconciler_SetupWithManager(t *testing.T) {
	type args struct {
		mgr ctrl.Manager
	}
	var tests = []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			"test for setup",
			args{
				mgr: nil,
			},
			false,
		},
	}
	for _, tt := range tests {
		driver, _ := drivers.NewDriver()
		t.Run(tt.name, func(t *testing.T) {
			r := &ClusterReconciler{
				driver:  driver,
				applier: applier.NewApplier(),
			}
			if err := r.SetupWithManager(tt.args.mgr); (err != nil) != tt.wantErr {
				t.Errorf("SetupWithManager() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

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
