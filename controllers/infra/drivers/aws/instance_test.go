package aws

import (
	"testing"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"
)

func TestReconcileInstance(t *testing.T) {
	type args struct {
		infra *v1.Infra
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			"test get instance",
			args{nil},
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err, _ := ReconcileInstance(tt.args.infra); (err != nil) != tt.wantErr {
				t.Errorf("ReconcileInstance() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
