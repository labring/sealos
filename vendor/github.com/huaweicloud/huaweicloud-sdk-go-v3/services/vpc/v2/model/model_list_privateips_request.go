package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type ListPrivateipsRequest struct {
	// 私有IP所在子网的唯一标识

	SubnetId string `json:"subnet_id"`
	// 每页返回的个数

	Limit *int32 `json:"limit,omitempty"`
	// 分页查询起始的资源id，为空时查询第一页

	Marker *string `json:"marker,omitempty"`
}

func (o ListPrivateipsRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ListPrivateipsRequest struct{}"
	}

	return strings.Join([]string{"ListPrivateipsRequest", string(data)}, " ")
}
