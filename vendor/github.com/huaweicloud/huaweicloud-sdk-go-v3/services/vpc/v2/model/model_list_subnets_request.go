package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type ListSubnetsRequest struct {
	// 每页返回的个数

	Limit *int32 `json:"limit,omitempty"`
	// 分页查询起始的资源id，为空时查询第一页

	Marker *string `json:"marker,omitempty"`
	// 按照vpc_id过滤查询  企业项目细粒度授权场景下，该字段必传

	VpcId *string `json:"vpc_id,omitempty"`
}

func (o ListSubnetsRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ListSubnetsRequest struct{}"
	}

	return strings.Join([]string{"ListSubnetsRequest", string(data)}, " ")
}
