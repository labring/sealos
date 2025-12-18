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
	"encoding/base64"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v4"
	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	utilclaims "github.com/labring/sealos/controllers/license/internal/util/claims"
	"github.com/labring/sealos/controllers/license/internal/util/cluster"
	"github.com/labring/sealos/controllers/license/internal/util/key"
)

func newTestLicense(t *testing.T) (*licensev1.License, *utilclaims.Claims) {
	t.Helper()
	decodeKey, err := base64.StdEncoding.DecodeString(key.GetEncryptionKey())
	if err != nil {
		t.Fatalf("failed to decode encryption key: %v", err)
	}
	privateKey, err := jwt.ParseRSAPrivateKeyFromPEM(decodeKey)
	if err != nil {
		t.Fatalf("failed to parse private key: %v", err)
	}
	claimData := utilclaims.ClaimData{
		"nodeCount":   3,
		"totalCPU":    16,
		"totalMemory": 32,
	}
	claims := &utilclaims.Claims{
		Type:      licensev1.ClusterLicenseType,
		ClusterID: "test-cluster",
		Data:      claimData,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	signed, err := token.SignedString(privateKey)
	if err != nil {
		t.Fatalf("failed to sign test token: %v", err)
	}
	return &licensev1.License{
		Spec: licensev1.LicenseSpec{
			Token: signed,
			Type:  claims.Type,
		},
	}, claims
}

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
			name: "valid license",
			args: func() args {
				license, claims := newTestLicense(t)
				clusterData := &utilclaims.ClusterClaimData{}
				if err := claims.Data.SwitchToClusterData(clusterData); err != nil {
					t.Fatalf("failed to convert cluster data: %v", err)
				}
				return args{
					license: license,
					data: &cluster.Info{
						ClusterID:        claims.ClusterID,
						ClusterClaimData: *clusterData,
					},
				}
			}(),
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := IsLicenseValid(tt.args.license, tt.args.data, tt.args.data.ClusterID)
			if (err != nil) != tt.wantErr {
				t.Errorf("IsLicenseValid() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if err != nil {
				// If there's an error, the test is expecting it, so we're done
				return
			}
			// If no error, validation succeeded, which is what we want
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
			name: "parse valid token",
			args: func() args {
				license, _ := newTestLicense(t)
				return args{license: license}
			}(),
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseLicenseToken(tt.args.license)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseLicenseToken() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got == nil || !got.Valid {
				t.Fatalf("ParseLicenseToken() returned invalid token: %+v", got)
			}
			if _, ok := got.Claims.(*utilclaims.Claims); !ok {
				t.Fatalf("ParseLicenseToken() claims type mismatch")
			}
		})
	}
}

func TestGetClaims(t *testing.T) {
	type args struct {
		license *licensev1.License
	}
	license, expectedClaims := newTestLicense(t)
	tests := []struct {
		name    string
		args    args
		want    *utilclaims.Claims
		wantErr bool
	}{
		{
			name: "get claims from valid token",
			args: args{license: license},
			want: expectedClaims,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := GetClaims(tt.args.license)
			if (err != nil) != tt.wantErr {
				t.Errorf("GetClaims() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got.Type != tt.want.Type || got.ClusterID != tt.want.ClusterID {
				t.Errorf("GetClaims() got = %+v, want = %+v", got, tt.want)
			}
		})
	}
}
