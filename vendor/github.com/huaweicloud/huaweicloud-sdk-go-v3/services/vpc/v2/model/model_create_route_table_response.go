package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type CreateRouteTableResponse struct {
	Routetable     *RouteTableResp `json:"routetable,omitempty"`
	HttpStatusCode int             `json:"-"`
}

func (o CreateRouteTableResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "CreateRouteTableResponse struct{}"
	}

	return strings.Join([]string{"CreateRouteTableResponse", string(data)}, " ")
}
