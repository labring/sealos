package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type UpdateRouteTableReq struct {
	// 功能说明：路由表名称  取值范围：0-64个字符，支持数字、字母、中文、_(下划线)、-（中划线）、.（点）

	Name *string `json:"name,omitempty"`
	// 功能说明：路由表描述信息  取值范围：0-255个字符，不能包含“<”和“>”

	Description *string `json:"description,omitempty"`
	// 功能说明：路由对象  取值范围：参见route字段说明。更新存在三种动作：     1）add：新增路由条目，type，destination，nexthop必选。     2）mod：修改路由信息，type，destination，nexthop必选。     3）del：删除路由条目，destination必选  约束：     每个路由表最大关联200条路由。     不支持直接修改destination，如需修改，只能使用del先删除对应路由，然后使用add新增路由。

	Routes map[string][]RouteTableRoute `json:"routes,omitempty"`
}

func (o UpdateRouteTableReq) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "UpdateRouteTableReq struct{}"
	}

	return strings.Join([]string{"UpdateRouteTableReq", string(data)}, " ")
}
