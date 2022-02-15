package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type UpdateVpcOption struct {
	// 功能说明：虚拟私有云名称  取值范围：0-64个字符，支持数字、字母、中文、_(下划线)、-（中划线）、.（点）  约束：如果名称不为空，则同一个租户下的VPC不允许重名。

	Name *string `json:"name,omitempty"`
	// 功能说明：虚拟私有云的描述  取值范围：0-255个字符，不能包含“<”和“>”。

	Description *string `json:"description,omitempty"`
	// 功能说明：虚拟私有云下可用子网的范围  取值范围：  - 10.0.0.0/8 ~ 10.255.255.240/28 - 172.16.0.0/12 ~ 172.31.255.240/28 - 192.168.0.0/16 ~ 192.168.255.240/28  约束：必须是ipv4 cidr格式，例如：192.168.0.0/16

	Cidr *string `json:"cidr,omitempty"`
	// 功能说明：路由信息列表，详情参见route对象

	Routes *[]Route `json:"routes,omitempty"`
}

func (o UpdateVpcOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "UpdateVpcOption struct{}"
	}

	return strings.Join([]string{"UpdateVpcOption", string(data)}, " ")
}
