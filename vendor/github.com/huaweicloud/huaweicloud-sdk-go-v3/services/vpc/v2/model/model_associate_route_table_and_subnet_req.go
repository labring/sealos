package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type AssociateRouteTableAndSubnetReq struct {
	// 路由表关联子网ID列表

	Associate *[]string `json:"associate,omitempty"`
	// 路由表解除关联子网ID列表

	Disassociate *[]string `json:"disassociate,omitempty"`
}

func (o AssociateRouteTableAndSubnetReq) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "AssociateRouteTableAndSubnetReq struct{}"
	}

	return strings.Join([]string{"AssociateRouteTableAndSubnetReq", string(data)}, " ")
}
