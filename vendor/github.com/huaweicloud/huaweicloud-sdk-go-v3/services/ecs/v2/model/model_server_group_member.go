package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// 云服务器组添加、删除成员列表
type ServerGroupMember struct {
	// 云服务器UUID。

	InstanceUuid string `json:"instance_uuid"`
}

func (o ServerGroupMember) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ServerGroupMember struct{}"
	}

	return strings.Join([]string{"ServerGroupMember", string(data)}, " ")
}
