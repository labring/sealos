package controllers

import (
	"testing"

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
