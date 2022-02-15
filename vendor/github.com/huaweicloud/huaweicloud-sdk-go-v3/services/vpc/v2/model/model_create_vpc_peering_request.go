package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type CreateVpcPeeringRequest struct {
	Body *CreateVpcPeeringRequestBody `json:"body,omitempty"`
}

func (o CreateVpcPeeringRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "CreateVpcPeeringRequest struct{}"
	}

	return strings.Join([]string{"CreateVpcPeeringRequest", string(data)}, " ")
}
