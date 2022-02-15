package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type Route struct {
	// 功能说明：路由目的地 取值范围：IP地址段 约束：仅支持配置默认路由，且其取值只能是0.0.0.0/0

	Destination *string `json:"destination,omitempty"`
	// 功能说明：路由下一跳IP地址 取值范围：ipv4地址格式 约束：nexthop仅支持所关联的子网范围内IP地址

	Nexthop *string `json:"nexthop,omitempty"`
}

func (o Route) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "Route struct{}"
	}

	return strings.Join([]string{"Route", string(data)}, " ")
}
