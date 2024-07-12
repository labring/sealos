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
	"time"

	"github.com/golang-jwt/jwt/v4"

	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	utilclaims "github.com/labring/sealos/controllers/license/internal/util/claims"
	"github.com/labring/sealos/controllers/license/internal/util/cluster"
	"github.com/labring/sealos/controllers/license/internal/util/errors"
	"github.com/labring/sealos/controllers/license/internal/util/key"
	"github.com/labring/sealos/controllers/pkg/crypto"
)

func ParseLicenseToken(license *licensev1.License) (*jwt.Token, error) {
	token, err := jwt.ParseWithClaims(license.Spec.Token, &utilclaims.Claims{},
		func(_ *jwt.Token) (interface{}, error) {
			decodeKey, err := base64.StdEncoding.DecodeString(key.EncryptionKey)
			if err != nil {
				return nil, err
			}
			publicKey, err := crypto.ParseRSAPublicKeyFromPEM(string(decodeKey))
			if err != nil {
				return nil, err
			}
			return publicKey, nil
		})
	if err != nil {
		return nil, err
	}
	return token, nil
}

func GetClaims(license *licensev1.License) (*utilclaims.Claims, error) {
	token, err := ParseLicenseToken(license)
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*utilclaims.Claims)
	if !ok {
		return nil, errors.ErrClaimsConvent
	}
	return claims, nil
}

func IsLicenseValid(license *licensev1.License, clusterInfo *cluster.Info, clusterID string) (licensev1.ValidationCode, error) {
	token, err := ParseLicenseToken(license)
	if err != nil {
		return licensev1.ValidationError, err
	}
	if !token.Valid {
		return licensev1.ValidationExpired, nil
	}
	claims, err := GetClaims(license)
	if err != nil {
		return licensev1.ValidationError, err
	}
	// if clusterID is empty, it means this license is a super license.
	if claims.ClusterID != "" && claims.ClusterID != clusterID {
		return licensev1.ValidationClusterIDMismatch, nil
	}

	if claims.Type == licensev1.ClusterLicenseType {
		if !clusterInfo.CompareWithClaimData(&claims.Data) {
			return licensev1.ValidationClusterInfoMismatch, nil
		}
	}
	return licensev1.ValidationSuccess, nil
}

func GetLicenseExpireTime(license *licensev1.License) (time.Time, error) {
	claims, err := GetClaims(license)
	if err != nil {
		return time.Time{}, err
	}
	return claims.ExpiresAt.UTC(), nil
}
