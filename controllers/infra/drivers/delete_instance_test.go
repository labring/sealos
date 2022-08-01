package drivers

import (
	"testing"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"
)

func TestDriver_DeleteInstances(t *testing.T) {
	type args struct {
		hosts *v1.Hosts
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			"test delete instance",
			args{hosts: &v1.Hosts{
				Count: 0,
				Metadata: []v1.Metadata{
					{
						IP: nil,
						ID: "i-0d72e0c54323d1d67",
					},
				},
			}},
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			d, err := NewDriver()
			if err != nil {
				t.Errorf("create driver failed")
			}
			if err := d.DeleteInstances(tt.args.hosts); (err != nil) != tt.wantErr {
				t.Errorf("DeleteInstances() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
