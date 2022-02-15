package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type UpdateVpcPeeringRequestBody struct {
	Peering *UpdateVpcPeeringOption `json:"peering"`
}

func (o UpdateVpcPeeringRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "UpdateVpcPeeringRequestBody struct{}"
	}

	return strings.Join([]string{"UpdateVpcPeeringRequestBody", string(data)}, " ")
}
