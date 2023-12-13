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

package claims

import (
	"github.com/golang-jwt/jwt/v4"
	"github.com/mitchellh/mapstructure"

	v1 "github.com/labring/sealos/controllers/license/api/v1"
)

type Claims struct {
	Type      v1.LicenseType `json:"type"`
	ClusterID string         `json:"clusterID"`
	Data      ClaimData      `json:"data"`

	jwt.RegisteredClaims
}

type ClaimData map[string]interface{}

func (c *ClaimData) SwitchToAccountData(data *AccountClaimData) error {
	return mapstructure.Decode(c, data)
}

func (c *ClaimData) SwitchToClusterData(data *ClusterClaimData) error {
	return mapstructure.Decode(c, data)
}

type AccountClaimData struct {
	Amount int64 `json:"amount"`
}

// TODO add cluster claims data

type ClusterClaimData struct {
}
