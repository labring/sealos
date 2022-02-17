package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type RouteTableRoute struct {
	// 功能说明：路由的类型 取值范围： ecs：弹性云服务器 eni：网卡 vip：虚拟IP nat：NAT网关 peering：对等连接 vpn：虚拟专用网络 dc：云专线 cc：云连接 egw：VPC终端节点

	Type string `json:"type"`
	// 功能说明：路由目的网段 约束：合法的CIDR格式

	Destination string `json:"destination"`
	// 功能说明：路由下一跳对象的ID 取值范围： 当type为ecs时，传入ecs实例ID 当type为eni时，取值为从网卡ID 当type为vip时，取值为vip对应的IP地址 当type为nat时，取值为nat实例对应的ID 当type为peering时，取值为peering对应实例ID 当type为vpn时，取值为vpn实例ID 当type为dc时，取值为dc实例ID 当type为cc时，取值为cc的实例ID

	Nexthop string `json:"nexthop"`
	// 功能说明：路由的描述信息 取值范围：0-255个字符，不能包含“<”和“>”

	Description *string `json:"description,omitempty"`
}

func (o RouteTableRoute) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "RouteTableRoute struct{}"
	}

	return strings.Join([]string{"RouteTableRoute", string(data)}, " ")
}
