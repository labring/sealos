package drivers

import (
	"testing"

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
					ID:         []string{"d-bp1db3ueezr56lk2xewv"},
					VolumeType: "cloud_essd",
					Capacity:   40,
					//Name:     "/dev/sda2",
				},
				desDisk: &v1.Disk{
					VolumeType: "cloud_auto",
					Capacity:   40,
					//Name:     "/dev/sda2",
				},
			},
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			d, err := NewDriver("aliyun")
			if err != nil {
				t.Errorf("create driver failed")
			}
			if err := d.ModifyVolume(tt.args.curDisk, tt.args.desDisk); (err != nil) != tt.wantErr {
				t.Errorf("createInstances() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
