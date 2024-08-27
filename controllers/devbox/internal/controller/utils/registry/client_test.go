package registry

import "testing"

func TestClient_TagImage(t1 *testing.T) {
	type fields struct {
		Username string
		Password string
	}
	type args struct {
		hostName  string
		imageName string
		oldTag    string
		newTag    string
	}
	tests := []struct {
		name    string
		fields  fields
		args    args
		wantErr bool
	}{
		{
			name: "Test1",
			fields: fields{
				Username: "admin",
				Password: "passw0rd",
			},
			args: args{
				hostName:  "sealos.hub:5000",
				imageName: "default/devbox-sample",
				oldTag:    "2024-08-21-072021",
				newTag:    "test",
			},
		},
	}
	for _, tt := range tests {
		t1.Run(tt.name, func(t1 *testing.T) {
			t := &Client{
				Username: tt.fields.Username,
				Password: tt.fields.Password,
			}
			if err := t.TagImage(tt.args.hostName, tt.args.imageName, tt.args.oldTag, tt.args.newTag); (err != nil) != tt.wantErr {
				t1.Errorf("TagImage() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
