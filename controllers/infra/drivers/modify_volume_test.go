package drivers

import (
	"testing"

	"github.com/aws/aws-sdk-go-v2/service/ec2/types"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"
)

func TestDriver_modifyVolume(t *testing.T) {
	type args struct {
		curDisk *v1.Disk
		desDisk *v1.Disk
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			"test modify volume",
			args{
				curDisk: &v1.Disk{
					Type:     string(types.VolumeTypeGp3),
					Capacity: 35,
					//Name:     "/dev/sda2",
				},
				desDisk: &v1.Disk{
					Type:     string(types.VolumeTypeGp3),
					Capacity: 40,
					//Name:     "/dev/sda2",
				},
			},
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			d, err := NewDriver("aws")
			if err != nil {
				t.Errorf("create driver failed")
			}
			if err := d.ModifyVolume(tt.args.curDisk, tt.args.desDisk); (err != nil) != tt.wantErr {
				t.Errorf("createInstances() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
