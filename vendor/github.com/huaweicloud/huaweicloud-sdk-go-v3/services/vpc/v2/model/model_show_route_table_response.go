package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type ShowRouteTableResponse struct {
	Routetable     *RouteTableResp `json:"routetable,omitempty"`
	HttpStatusCode int             `json:"-"`
}

func (o ShowRouteTableResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowRouteTableResponse struct{}"
	}

	return strings.Join([]string{"ShowRouteTableResponse", string(data)}, " ")
}
