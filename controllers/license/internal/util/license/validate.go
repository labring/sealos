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
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v4"
	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	utilclaims "github.com/labring/sealos/controllers/license/internal/util/claims"
	"github.com/labring/sealos/controllers/license/internal/util/cluster"
	licensepkg "github.com/labring/sealos/controllers/pkg/license"
)

// ValidationError represents a license validation error with structured information
type ValidationError struct {
	Code    licensev1.ValidationCode
	Message string
}

func (e ValidationError) Error() string {
	return e.Message
}

// NewValidationError creates a new ValidationError with the given code and message
func NewValidationError(code licensev1.ValidationCode, message string) error {
	return ValidationError{
		Code:    code,
		Message: message,
	}
}

func ParseLicenseToken(license *licensev1.License) (*jwt.Token, error) {
	return licensepkg.ParseToken(license.Spec.Token)
}

func GetClaims(license *licensev1.License) (*utilclaims.Claims, error) {
	claims, err := licensepkg.GetClaimsFromLicense(license)
	if err != nil {
		return nil, err
	}
	return claims, nil
}

func IsLicenseValid(
	license *licensev1.License,
	clusterInfo *cluster.Info,
	clusterID string,
) error {
	token, err := ParseLicenseToken(license)
	if err != nil {
		return NewValidationError(
			licensev1.ValidationError,
			fmt.Sprintf("failed to parse license token: %v", err),
		)
	}
	if !token.Valid {
		// Get the expiration time from claims to provide more detailed error message
		claims, ok := token.Claims.(*utilclaims.Claims)
		if ok && claims.ExpiresAt != nil {
			return NewValidationError(
				licensev1.ValidationExpired,
				"license has expired on "+claims.ExpiresAt.Format(time.DateTime),
			)
		}
		return NewValidationError(
			licensev1.ValidationExpired,
			"license has expired and is no longer valid",
		)
	}

	claims, err := GetClaims(license)
	if err != nil {
		return NewValidationError(
			licensev1.ValidationError,
			fmt.Sprintf("failed to get license claims: %v", err),
		)
	}

	// if clusterID is empty, it means this license is a super license.
	if claims.ClusterID != "" && claims.ClusterID != clusterID {
		return NewValidationError(
			licensev1.ValidationClusterIDMismatch,
			fmt.Sprintf(
				"license cluster ID mismatch: license cluster ID is '%s' but current cluster ID is '%s'",
				claims.ClusterID,
				clusterID,
			),
		)
	}

	if claims.Type == licensev1.ClusterLicenseType {
		if !clusterInfo.CompareWithClaimData(&claims.Data) {
			return NewValidationError(
				licensev1.ValidationClusterInfoMismatch,
				fmt.Sprintf(
					"license cluster constraints not met: license requires %v but current cluster does not satisfy these constraints",
					claims.Data,
				),
			)
		}
	}

	// License is valid
	return nil
}

func GetLicenseExpireTime(license *licensev1.License) (time.Time, error) {
	claims, err := GetClaims(license)
	if err != nil {
		return time.Time{}, err
	}
	return claims.ExpiresAt.UTC(), nil
}
