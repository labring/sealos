package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type CreateRouteTableReq struct {
	// 功能说明：路由表名称  取值范围：0-64个字符，支持数字、字母、中文、_(下划线)、-（中划线）、.（点）

	Name *string `json:"name,omitempty"`
	// 功能说明：路由对象，参见route字段说明  约束：每个路由表最大关联200条路由

	Routes *[]RouteTableRoute `json:"routes,omitempty"`
	// 路由表所在的虚拟私有云ID

	VpcId string `json:"vpc_id"`
	// 功能说明：路由表描述信息  取值范围：0-255个字符，不能包含“<”和“>”

	Description *string `json:"description,omitempty"`
}

func (o CreateRouteTableReq) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "CreateRouteTableReq struct{}"
	}

	return strings.Join([]string{"CreateRouteTableReq", string(data)}, " ")
}
