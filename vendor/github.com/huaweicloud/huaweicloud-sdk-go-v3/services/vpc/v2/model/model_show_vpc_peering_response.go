package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type ShowVpcPeeringResponse struct {
	Peering        *VpcPeering `json:"peering,omitempty"`
	HttpStatusCode int         `json:"-"`
}

func (o ShowVpcPeeringResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowVpcPeeringResponse struct{}"
	}

	return strings.Join([]string{"ShowVpcPeeringResponse", string(data)}, " ")
}
