package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type ListServerGroupsResponse struct {
	// 弹性云服务器组信息

	ServerGroups *[]ListServerGroupsResult `json:"server_groups,omitempty"`

	PageInfo       *ListServerGroupsPageInfoResult `json:"page_info,omitempty"`
	HttpStatusCode int                             `json:"-"`
}

func (o ListServerGroupsResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ListServerGroupsResponse struct{}"
	}

	return strings.Join([]string{"ListServerGroupsResponse", string(data)}, " ")
}
