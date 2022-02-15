package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type CreateRouteTableRequest struct {
	Body *CreateRoutetableReqBody `json:"body,omitempty"`
}

func (o CreateRouteTableRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "CreateRouteTableRequest struct{}"
	}

	return strings.Join([]string{"CreateRouteTableRequest", string(data)}, " ")
}
