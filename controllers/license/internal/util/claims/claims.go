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

// Claims is the data structure of license claims
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

// ClusterClaimData is the data structure of cluster license
// example:
//	{
//	  "nodeCount": 3,
//	  "totalCPU": 6,
//	  "totalMemory": 12,
//	}

type ClusterClaimData struct {
	NodeCount   int `json:"nodeCount"`
	TotalCPU    int `json:"totalCPU"`    // in core
	TotalMemory int `json:"totalMemory"` // in GB
}

// Compare compares the claims with the data
// return true if the claims is equal or lager to the data
func (c *ClusterClaimData) Compare(data *ClusterClaimData) bool {
	if c.NodeCount > data.NodeCount || c.TotalCPU > data.TotalCPU || c.TotalMemory > data.TotalMemory {
		return false
	}
	return true
}
