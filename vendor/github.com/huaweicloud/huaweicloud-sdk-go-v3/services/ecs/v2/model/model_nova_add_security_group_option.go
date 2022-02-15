package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type NovaAddSecurityGroupOption struct {
	// 弹性云服务器添加的安全组名称，会对云服务器中配置的网卡生效。

	Name string `json:"name"`
}

func (o NovaAddSecurityGroupOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaAddSecurityGroupOption struct{}"
	}

	return strings.Join([]string{"NovaAddSecurityGroupOption", string(data)}, " ")
}
