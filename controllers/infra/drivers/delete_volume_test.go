package drivers

import (
	"testing"
)

func TestDriver_deleteVolumes(t *testing.T) {
	type args struct {
		disksID []string
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			"test delete volume",
			args{
				[]string{},
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
			if err := d.DeleteVolume(tt.args.disksID); (err != nil) != tt.wantErr {
				t.Errorf("createInstances() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
