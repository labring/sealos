package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// 弹性云服务器所属安全组列表。
type ServerSecurityGroup struct {
	// 安全组名称或者UUID。

	Name string `json:"name"`
	// 安全组ID。

	Id string `json:"id"`
}

func (o ServerSecurityGroup) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ServerSecurityGroup struct{}"
	}

	return strings.Join([]string{"ServerSecurityGroup", string(data)}, " ")
}
