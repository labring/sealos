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

package meta

import (
	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	claimsutil "github.com/labring/sealos/controllers/license/internal/util/claims"
	licenseutil "github.com/labring/sealos/controllers/license/internal/util/license"
)

// Meta is the license metadata, which will be stored in database

type Meta struct {
	Token          string            `bson:"token"`
	ActivationTime string            `bson:"activationTime"`
	Claims         claimsutil.Claims `bson:"claims"`
}

func New(license *licensev1.License) (*Meta, error) {
	claims, err := licenseutil.GetClaims(license)
	if err != nil {
		return nil, err
	}
	return &Meta{
		Token:          license.Spec.Token,
		ActivationTime: license.Status.ActivationTime.Format("2006-01-02 15:04:05"),
		Claims:         *claims,
	}, nil
}
