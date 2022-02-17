package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type ShowVpcPeeringRequest struct {
	// 对等连接ID

	PeeringId string `json:"peering_id"`
}

func (o ShowVpcPeeringRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowVpcPeeringRequest struct{}"
	}

	return strings.Join([]string{"ShowVpcPeeringRequest", string(data)}, " ")
}
