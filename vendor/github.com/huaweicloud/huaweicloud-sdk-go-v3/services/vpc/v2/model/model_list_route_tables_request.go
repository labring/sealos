package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type ListRouteTablesRequest struct {
	// 每页返回的个数

	Limit *int32 `json:"limit,omitempty"`
	// 分页查询起始的资源ID，为空时为查询第一页

	Marker *string `json:"marker,omitempty"`
	// 路由表ID，可过滤对应ID的路由表

	Id *string `json:"id,omitempty"`
	// 虚拟私有云ID，可过滤对应虚拟私有云包含的路由表

	VpcId *string `json:"vpc_id,omitempty"`
	// 子网ID，可过滤对应子网关联的路由表

	SubnetId *string `json:"subnet_id,omitempty"`
}

func (o ListRouteTablesRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ListRouteTablesRequest struct{}"
	}

	return strings.Join([]string{"ListRouteTablesRequest", string(data)}, " ")
}
