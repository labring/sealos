package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type UpdatePortOption struct {
	// 功能说明：端口名称 取值范围：0~255个字符，支持中文、英文、字母、_(下划线)、-（中划线）

	Name *string `json:"name,omitempty"`
	// 安全组的ID列表

	SecurityGroups *[]string `json:"security_groups,omitempty"`
	// 功能说明：IP/Mac对列表 约束： - IP地址不允许为 “0.0.0.0”。 - 如果配置地址池较大（CIDR掩码小于24位），建议为该port配置一个单独的安全组。 - 为虚拟IP配置后端ECS场景，allowed_address_pairs中配置的IP地址，必须为ECS网卡已有的IP地址，否则可能会导致虚拟IP通信异常。

	AllowedAddressPairs *[]AllowedAddressPair `json:"allowed_address_pairs,omitempty"`
	// 功能说明：DHCP的扩展Option(扩展属性)

	ExtraDhcpOpts *[]ExtraDhcpOpt `json:"extra_dhcp_opts,omitempty"`
}

func (o UpdatePortOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "UpdatePortOption struct{}"
	}

	return strings.Join([]string{"UpdatePortOption", string(data)}, " ")
}
