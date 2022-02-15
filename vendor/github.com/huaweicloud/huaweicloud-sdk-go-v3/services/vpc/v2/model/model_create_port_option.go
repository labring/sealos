package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type CreatePortOption struct {
	// 功能说明：端口名称 取值范围：0~255个字符，支持中文、英文、字母、_(下划线)、-（中划线），默认为空

	Name *string `json:"name,omitempty"`
	// 功能说明：端口所属网络的ID 约束：必须是存在的网络ID

	NetworkId string `json:"network_id"`
	// 功能说明：端口IP 例如：\"fixed_ips\": [{\"subnet_id\": \"4dc70db6-cb7f-4200-9790-a6a910776bba\", \"ip_address\": \"192.169.25.79\"}] 约束：ipv4场景下一个端口只支持一个fixed_ip，且不支持更新

	FixedIps *[]FixedIp `json:"fixed_ips,omitempty"`
	// 功能说明：端口设备所属 取值范围：目前只支持指定\"\"和\"neutron:VIP_PORT\"；neutron:VIP_PORT表示创建的是VIP

	DeviceOwner *string `json:"device_owner,omitempty"`
	// 功能说明：安全组的ID列表；例如：\"security_groups\": [\"a0608cbf-d047-4f54-8b28-cd7b59853fff\"] 取值范围：默认值为系统默认安全组

	SecurityGroups *[]string `json:"security_groups,omitempty"`
	// 功能说明：管理状态 取值范围：只支持true，默认为true

	AdminStateUp *bool `json:"admin_state_up,omitempty"`
	// 功能说明：IP/Mac对列表 约束：IP地址不允许为 “0.0.0.0/0” 如果配置的地址池较大（CIDR掩码小于24位），建议为该port配置一个单独的安全组。

	AllowedAddressPairs *[]AllowedAddressPair `json:"allowed_address_pairs,omitempty"`
	// 功能说明：DHCP的扩展Option(扩展属性)

	ExtraDhcpOpts *[]ExtraDhcpOpt `json:"extra_dhcp_opts,omitempty"`
	// 功能说明：端口所属项目ID

	TenantId *string `json:"tenant_id,omitempty"`
}

func (o CreatePortOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "CreatePortOption struct{}"
	}

	return strings.Join([]string{"CreatePortOption", string(data)}, " ")
}
