package license

import (
	"testing"

	"github.com/golang-jwt/jwt/v4"

	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	utilclaims "github.com/labring/sealos/controllers/license/internal/util/claims"
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
						Token: "",
					},
				},
			},
			want:    true,
			wantErr: false,
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

func TestParseLicenseToken(t *testing.T) {
	type args struct {
		license *licensev1.License
	}
	tests := []struct {
		name    string
		args    args
		want    *jwt.Token
		wantErr bool
	}{
		{
			name: "test",
			args: args{
				license: &licensev1.License{
					Spec: licensev1.LicenseSpec{
						Token: "",
					},
				},
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseLicenseToken(tt.args.license)
			t.Log(got.Claims)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseLicenseToken() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
		})
	}
}

func TestGetClaims(t *testing.T) {
	type args struct {
		license *licensev1.License
	}
	tests := []struct {
		name    string
		args    args
		want    *utilclaims.Claims
		wantErr bool
	}{
		{
			name: "test",
			args: args{
				license: &licensev1.License{
					Spec: licensev1.LicenseSpec{
						Token: "",
					},
				},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := GetClaims(tt.args.license)
			if (err != nil) != tt.wantErr {
				t.Errorf("GetClaims() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			t.Log(got)
		})
	}
}
