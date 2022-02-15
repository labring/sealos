package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type CreateVpcRouteRequest struct {
	Body *CreateVpcRouteRequestBody `json:"body,omitempty"`
}

func (o CreateVpcRouteRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "CreateVpcRouteRequest struct{}"
	}

	return strings.Join([]string{"CreateVpcRouteRequest", string(data)}, " ")
}
