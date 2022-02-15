package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type ListServerGroupsRequest struct {
	// 查询返回server group数量限制。

	Limit *int32 `json:"limit,omitempty"`
	// 从marker指定的server group的下一条数据开始查询。

	Marker *string `json:"marker,omitempty"`
}

func (o ListServerGroupsRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ListServerGroupsRequest struct{}"
	}

	return strings.Join([]string{"ListServerGroupsRequest", string(data)}, " ")
}
