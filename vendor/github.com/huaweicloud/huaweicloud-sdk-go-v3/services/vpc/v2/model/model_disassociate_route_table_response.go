package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type DisassociateRouteTableResponse struct {
	Routetable     *RouteTableResp `json:"routetable,omitempty"`
	HttpStatusCode int             `json:"-"`
}

func (o DisassociateRouteTableResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "DisassociateRouteTableResponse struct{}"
	}

	return strings.Join([]string{"DisassociateRouteTableResponse", string(data)}, " ")
}
