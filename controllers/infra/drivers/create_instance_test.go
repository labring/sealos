package drivers

import (
	"testing"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/aws/aws-sdk-go-v2/service/ec2/types"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"
)

func TestDriver_createInstances(t *testing.T) {
	type args struct {
		hosts *v1.Hosts
		infra *v1.Infra
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			"test create instance",
			args{
				hosts: &v1.Hosts{
					Roles:     []string{"master"},
					Count:     1,
					Resources: nil,
					Flavor:    string(types.InstanceTypeT2Micro),
					Arch:      "",
					Image:     "ami-08bb4e3ce08ca7ddb",
					Disks:     nil,
					Metadata:  nil,
				},
				infra: &v1.Infra{
					TypeMeta: metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{
						Name:      "sealos-infra",
						Namespace: "sealos-infra-ns",
					},
				},
			},
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			d, err := NewDriver()
			if err != nil {
				t.Errorf("create driver failed")
			}
			if err := d.CreateInstances(tt.args.hosts, tt.args.infra); (err != nil) != tt.wantErr {
				t.Errorf("createInstances() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
