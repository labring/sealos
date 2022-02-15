package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type AssociateServerVirtualIpOption struct {
	// 网卡的子网ID。

	SubnetId string `json:"subnet_id"`
	// 网卡即将配置的私有IP的地址。

	IpAddress string `json:"ip_address"`
	// 私有IP的allowed_address_pairs属性是否添加网卡的IP/Mac对。

	ReverseBinding *bool `json:"reverse_binding,omitempty"`
}

func (o AssociateServerVirtualIpOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "AssociateServerVirtualIpOption struct{}"
	}

	return strings.Join([]string{"AssociateServerVirtualIpOption", string(data)}, " ")
}
