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
				[]string{"d-bp1ds373gmumyeoxj149", "d-bp1g8yzs1qf3rt8nx33k"},
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
			if err := d.DeleteVolume(tt.args.disksID); (err != nil) != tt.wantErr {
				t.Errorf("DeleteVolume() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
