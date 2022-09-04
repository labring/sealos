package drivers

import (
	"testing"

	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
	v1 "github.com/labring/sealos/controllers/infra/api/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestDriver_CreateVolumes(t *testing.T) {
	type args struct {
		infra *v1.Infra
		host  *v1.Hosts
		disks []v1.Disk
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			"test create volume",
			args{
				infra: &v1.Infra{
					TypeMeta: metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{
						Name:      "sealos-infra",
						Namespace: "sealos-infra-ns",
					},
					Spec: v1.InfraSpec{
						AvailabilityZone: "cn-north-1a",
					},
				},
				disks: []v1.Disk{{
					Type:     string(types.VolumeTypeGp3),
					Capacity: 40,
					Name:     "/dev/sda2",
				}},
				host: &v1.Hosts{
					Roles:     []string{"master"},
					Count:     1,
					Resources: nil,
					Flavor:    string(types.InstanceTypeT2Micro),
					Arch:      "",
					Image:     "ami-05248307900d52e3a",
					Disks:     nil,
					Metadata:  []v1.Metadata{},
				},
			},
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			d, _ := NewDriver()
			if err := d.CreateVolumes(tt.args.infra, tt.args.host, tt.args.disks); (err != nil) != tt.wantErr {
				t.Errorf("CreateVolumes() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
