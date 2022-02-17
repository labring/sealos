package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type UpdateRouteTableResponse struct {
	Routetable     *RouteTableResp `json:"routetable,omitempty"`
	HttpStatusCode int             `json:"-"`
}

func (o UpdateRouteTableResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "UpdateRouteTableResponse struct{}"
	}

	return strings.Join([]string{"UpdateRouteTableResponse", string(data)}, " ")
}
