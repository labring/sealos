package drivers

import (
	"testing"

	"github.com/aws/aws-sdk-go-v2/service/ec2/types"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"
)

func TestApplier_ReconcileInstance(t *testing.T) {
	driver, err := NewDriver()
	if err != nil {
		t.Errorf("new driver failed %v", err)
	}

	hosts := []v1.Hosts{
		{
			Roles:  []string{"master"},
			Count:  3,
			Flavor: string(types.InstanceTypeT2Micro),
			Image:  "ami-05248307900d52e3a",
		},
		{
			Roles:  []string{"node"},
			Count:  3,
			Flavor: string(types.InstanceTypeT2Micro),
			Image:  "ami-05248307900d52e3a",
		},
	}

	infra := &v1.Infra{
		TypeMeta: metav1.TypeMeta{},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "sealos-infra",
			Namespace: "sealos-infra-ns",
		},
	}
	infra.Spec.Hosts = hosts

	type args struct {
		infra  *v1.Infra
		driver Driver
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			"test for apply instance",
			args{
				infra:  infra,
				driver: driver,
			},
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			a := NewApplier()
			if err := a.ReconcileInstance(tt.args.infra, tt.args.driver); (err != nil) != tt.wantErr {
				t.Errorf("ReconcileInstance() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
