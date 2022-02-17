package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type UpdateVpcPeeringRequest struct {
	// 对等连接ID

	PeeringId string `json:"peering_id"`

	Body *UpdateVpcPeeringRequestBody `json:"body,omitempty"`
}

func (o UpdateVpcPeeringRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "UpdateVpcPeeringRequest struct{}"
	}

	return strings.Join([]string{"UpdateVpcPeeringRequest", string(data)}, " ")
}
