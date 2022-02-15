package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type AssociateRouteTableRequest struct {
	// 路由表ID

	RoutetableId string `json:"routetable_id"`

	Body *RoutetableAssociateReqbody `json:"body,omitempty"`
}

func (o AssociateRouteTableRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "AssociateRouteTableRequest struct{}"
	}

	return strings.Join([]string{"AssociateRouteTableRequest", string(data)}, " ")
}
