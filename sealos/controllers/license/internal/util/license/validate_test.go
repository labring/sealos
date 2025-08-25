// Copyright © 2023 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package license

import (
	"testing"

	"github.com/golang-jwt/jwt/v4"

	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	utilclaims "github.com/labring/sealos/controllers/license/internal/util/claims"
	"github.com/labring/sealos/controllers/license/internal/util/cluster"
)

func TestIsLicenseValid(t *testing.T) {
	type args struct {
		license *licensev1.License
		data    *cluster.Info
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "test",
			args: args{
				license: &licensev1.License{
					Spec: licensev1.LicenseSpec{
						Token: "",
						Type:  licensev1.ClusterLicenseType,
					},
				},
				data: &cluster.Info{
					ClusterID: "",
					ClusterClaimData: utilclaims.ClusterClaimData{
						NodeCount:   3,
						TotalCPU:    16,
						TotalMemory: 32,
					},
				},
			},
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := IsLicenseValid(tt.args.license, tt.args.data, "")
			if (err != nil) != tt.wantErr {
				t.Errorf("IsLicenseValid() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			t.Log(got)
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
