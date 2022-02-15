package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type NovaRemoveSecurityGroupOption struct {
	// 弹性云服务器移除的安全组名称，会对云服务器中配置的网卡生效。

	Name string `json:"name"`
}

func (o NovaRemoveSecurityGroupOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaRemoveSecurityGroupOption struct{}"
	}

	return strings.Join([]string{"NovaRemoveSecurityGroupOption", string(data)}, " ")
}
