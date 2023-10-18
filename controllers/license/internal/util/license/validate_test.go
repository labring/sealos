package license

import (
	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	"testing"
)

func TestIsLicenseValid(t *testing.T) {
	type args struct {
		license *licensev1.License
	}
	tests := []struct {
		name    string
		args    args
		want    bool
		wantErr bool
	}{
		{
			name: "test",
			args: args{
				license: &licensev1.License{
					Spec: licensev1.LicenseSpec{
						Token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJTZWFsb3MiLCJpYXQiOjE2OTA0NDU5NjIsImFtdCI6MjAwMH0.ZzZfPRbNiNvRBLMn5FGJeKitRPHmUHZ1qvnGdJUIbIH1L5mQ4yECzvvsa5S8-OTqF6HXmrw9QmFcQOjoz5GpqjqrqXdH2H-JDXFGNNAib2J9UmLFmtV1BVm3zReucfK-bOY5NiWOr5wplEVwkoUKNPHLY5Mw142y9J62vELE-XW-hb3xcmWjLTPVRYgMqk0KEi7Z7cQ_rS0QgJh1Rqb2WS6AKz2ILE5J8XUhhhUva0nCEyLzE-I8oZtV6kugQy8YjWI-SjfneFOLI8-Pg40vry6DZZ-_J_9QmjkUlZx0YNMRiRA5yg2yWeMEzVnam9L310TJgu6Od-bEUijsfOcZyw",
					},
				},
			},
			want:    false,
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := IsLicenseValid(tt.args.license)
			if (err != nil) != tt.wantErr {
				t.Errorf("IsLicenseValid() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("IsLicenseValid() got = %v, want %v", got, tt.want)
			}
		})
	}
}
