package drivers

import (
	"fmt"
	"testing"

	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"
)

func TestPrice_QueryPrice(t *testing.T) {
	hosts := []v1.Hosts{
		{
			Roles:  []string{"master"},
			Count:  2,
			Flavor: string(types.InstanceTypeT2Medium),
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
			Count:  2,
			Flavor: string(types.InstanceTypeT2Medium),
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
	}
	infra.Spec.Hosts = hosts

	type args struct {
		infra *v1.Infra
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			"test for query infra price/hour",
			args{
				infra: infra,
			},
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			value, err := infra.QueryPrice()
			if (err != nil) != tt.wantErr {
				t.Errorf("QueryPrice() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			fmt.Println("value:", value)
		})
	}
}
