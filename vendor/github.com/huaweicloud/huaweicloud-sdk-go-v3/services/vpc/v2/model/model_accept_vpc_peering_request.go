package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type AcceptVpcPeeringRequest struct {
	// 对等连接ID

	PeeringId string `json:"peering_id"`
}

func (o AcceptVpcPeeringRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "AcceptVpcPeeringRequest struct{}"
	}

	return strings.Join([]string{"AcceptVpcPeeringRequest", string(data)}, " ")
}
