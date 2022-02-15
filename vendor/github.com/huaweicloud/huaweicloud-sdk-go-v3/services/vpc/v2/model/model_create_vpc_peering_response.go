package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type CreateVpcPeeringResponse struct {
	Peering        *VpcPeering `json:"peering,omitempty"`
	HttpStatusCode int         `json:"-"`
}

func (o CreateVpcPeeringResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "CreateVpcPeeringResponse struct{}"
	}

	return strings.Join([]string{"CreateVpcPeeringResponse", string(data)}, " ")
}
