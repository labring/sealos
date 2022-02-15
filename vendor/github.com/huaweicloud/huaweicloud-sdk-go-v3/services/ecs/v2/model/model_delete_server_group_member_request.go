package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type DeleteServerGroupMemberRequest struct {
	// 云服务器组ID。

	ServerGroupId string `json:"server_group_id"`

	Body *DeleteServerGroupMemberRequestBody `json:"body,omitempty"`
}

func (o DeleteServerGroupMemberRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "DeleteServerGroupMemberRequest struct{}"
	}

	return strings.Join([]string{"DeleteServerGroupMemberRequest", string(data)}, " ")
}
