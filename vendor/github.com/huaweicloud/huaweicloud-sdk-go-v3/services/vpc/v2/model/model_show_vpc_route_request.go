package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type ShowVpcRouteRequest struct {
	// 路由ID

	RouteId string `json:"route_id"`
}

func (o ShowVpcRouteRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowVpcRouteRequest struct{}"
	}

	return strings.Join([]string{"ShowVpcRouteRequest", string(data)}, " ")
}
