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
