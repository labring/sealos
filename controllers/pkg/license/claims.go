// Copyright © 2026 sealos.
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
	"github.com/golang-jwt/jwt/v4"
	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	"github.com/mitchellh/mapstructure"
)

// Claims is the data structure of license claims
type Claims struct {
	Type      licensev1.LicenseType `json:"type"`
	ClusterID string                `json:"clusterID"`
	Data      ClaimData             `json:"data"`

	jwt.RegisteredClaims
}

type ClaimData map[string]any

func (c *ClaimData) SwitchToClusterData(data *ClusterClaimData) error {
	return mapstructure.Decode(c, data)
}

// ClusterClaimData is the data structure of cluster license
// example:
//
//	{
//	  "nodeCount": 3,
//	  "totalCPU": 6,
//	  "totalMemory": 12,
//	  "userCount": 100,
//	}
type ClusterClaimData struct {
	NodeCount   int `json:"nodeCount"   mapstructure:"nodeCount"`
	TotalCPU    int `json:"totalCPU"    mapstructure:"totalCPU"`    // in core
	TotalMemory int `json:"totalMemory" mapstructure:"totalMemory"` // in GB
	UserCount   int `json:"userCount"   mapstructure:"userCount"`
}

// Compare compares the claims with the data
// return true if the claims is equal or lager to the data
func (c *ClusterClaimData) Compare(data *ClusterClaimData) bool {
	if c.NodeCount > data.NodeCount || c.TotalCPU > data.TotalCPU ||
		c.TotalMemory > data.TotalMemory {
		return false
	}
	return true
}
