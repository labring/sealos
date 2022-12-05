package app_image

import (
	"testing"
)

func TestImageCRDBuilder_GetAppContent(t *testing.T) {
	type fields struct {
		imagename   string
		clustername string
		Content     *Content
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
		{name: "ttt", fields: fields{imagename: "a", clustername: "b", Content: &Content{
			README:         "aaa",
			ActionTemplate: make(map[string]string),
			ActionCMD:      make(map[string]string),
			AppConfig:      nil,
		}}, args: args{"/Users/jianghan/GolandProjects/cluster-image/applications/zalando-postgres-operator/14"}, wantErr: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			icb := &ImageCRDBuilder{
				imagename:   tt.fields.imagename,
				clustername: tt.fields.clustername,
				Content:     tt.fields.Content,
			}
			if err := icb.GetAppContent(tt.args.MountPoint); (err != nil) != tt.wantErr {
				t.Errorf("GetAppContent() error = %v, wantErr %v", err, tt.wantErr)
			}
			//fmt.Println(icb.Content.AppConfig)

			if err := icb.AppContentApply(); (err != nil) != tt.wantErr {
				t.Errorf("AppContentApply() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
