package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type RouteTableResp struct {
	// 功能说明：路由表ID  取值范围：标准UUID

	Id string `json:"id"`
	// 功能说明：路由表名称  取值范围：0-64个字符，支持数字、字母、中文、_(下划线)、-（中划线）、.（点）

	Name string `json:"name"`
	// 功能说明：是否为默认路由表  取值范围：true表示默认路由表；false表示自定义路由表

	Default bool `json:"default"`
	// 功能说明：路由对象，参见route字段说明。  约束：每个路由表最大关联200条路由

	Routes []RouteTableRoute `json:"routes"`
	// 功能说明：路由表所关联的子网  约束：只能关联路由表所属VPC下的子网

	Subnets []SubnetList `json:"subnets"`
	// 项目ID

	TenantId string `json:"tenant_id"`
	// 路由表所在的虚拟私有云ID

	VpcId string `json:"vpc_id"`
	// 功能说明：路由表描述信息  取值范围：0-255个字符，不能包含“<”和“>”

	Description string `json:"description"`
}

func (o RouteTableResp) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "RouteTableResp struct{}"
	}

	return strings.Join([]string{"RouteTableResp", string(data)}, " ")
}
