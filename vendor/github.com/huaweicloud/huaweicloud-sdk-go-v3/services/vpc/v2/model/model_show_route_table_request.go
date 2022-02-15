package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type ShowRouteTableRequest struct {
	// 路由表ID

	RoutetableId string `json:"routetable_id"`
}

func (o ShowRouteTableRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowRouteTableRequest struct{}"
	}

	return strings.Join([]string{"ShowRouteTableRequest", string(data)}, " ")
}
