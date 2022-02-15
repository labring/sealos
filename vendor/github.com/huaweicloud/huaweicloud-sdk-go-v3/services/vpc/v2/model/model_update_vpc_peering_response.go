package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type UpdateVpcPeeringResponse struct {
	Peering        *VpcPeering `json:"peering,omitempty"`
	HttpStatusCode int         `json:"-"`
}

func (o UpdateVpcPeeringResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "UpdateVpcPeeringResponse struct{}"
	}

	return strings.Join([]string{"UpdateVpcPeeringResponse", string(data)}, " ")
}
