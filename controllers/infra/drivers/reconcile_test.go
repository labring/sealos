package drivers

import (
	"testing"

	"github.com/labring/sealos/pkg/utils/yaml"

	"github.com/labring/sealos/pkg/types/v1beta1"

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
			Count:  1,
			Flavor: string(types.InstanceTypeT2Micro),
			Image:  "ami-05248307900d52e3a",
			Disks: []v1.Disk{
				{
					Type:     string(types.VolumeTypeGp3),
					Capacity: 35,
					Name:     "/dev/sda2",
				},
			},
		},
		{
			Roles:  []string{"node"},
			Count:  0,
			Flavor: string(types.InstanceTypeT2Micro),
			Image:  "ami-05248307900d52e3a",
			Disks: []v1.Disk{
				{
					Type:     string(types.VolumeTypeGp2),
					Capacity: 20,
					Name:     "/dev/sda2",
				},
			},
		},
	}

	infra := &v1.Infra{
		TypeMeta: metav1.TypeMeta{},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "sealos-infra",
			Namespace: "sealos-infra-ns",
		},
		Spec: v1.InfraSpec{
			SSH: v1beta1.SSH{
				PkName: "hurz_key",
			},
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

func Test_setHostsIndex(t *testing.T) {
	infra := &v1.Infra{
		Spec: v1.InfraSpec{
			SSH: v1beta1.SSH{},
			Hosts: []v1.Hosts{
				{
					Roles: []string{"master"},
					Count: 1,
				},
				{
					Roles: []string{"master"},
					Count: 1,
				},
				{
					Roles: []string{"master"},
					Count: 1,
				},
			},
		},
	}
	type args struct {
		infra *v1.Infra
	}
	tests := []struct {
		name string
		args args
	}{
		{
			"test set index",
			args{
				infra: infra,
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			setHostsIndex(tt.args.infra)
			yaml.ShowStructYaml(infra)
		})
	}
}
