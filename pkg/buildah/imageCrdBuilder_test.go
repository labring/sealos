package buildah

import (
	"testing"

	imagev1 "github.com/labring/sealos/controllers/imagehub/api/v1"
)

func TestImageCRDBuilder_ReadOrBuildAppConfig(t *testing.T) {
	type fields struct {
		imagename   string
		clustername string
		AppConfig   *imagev1.Image
	}
	type args struct {
		MountPoint string
	}
	tests := []struct {
		name    string
		fields  fields
		args    args
		wantErr bool
	}{
		{
			"test dump clusterfile configs",
			fields{
				imagename:   "a/b:c",
				clustername: "",
				AppConfig:   nil,
			},
			args{MountPoint: "/Users/jianghan/GolandProjects/sealos/controllers/imagehub"},
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			icb := &ImageCRDBuilder{
				imagename:   tt.fields.imagename,
				clustername: tt.fields.clustername,
				AppConfig:   tt.fields.AppConfig,
			}
			if err := icb.ReadOrBuildAppConfig(tt.args.MountPoint); (err != nil) != tt.wantErr {
				t.Errorf("ReadOrBuildAppConfig() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
