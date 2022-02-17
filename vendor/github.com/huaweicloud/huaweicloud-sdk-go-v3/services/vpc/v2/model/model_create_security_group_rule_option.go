package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type CreateSecurityGroupRuleOption struct {
	// 安全组ID

	SecurityGroupId string `json:"security_group_id"`
	// 功能说明：安全组规则描述 取值范围：0-255个字符，支持数字、字母、中文字符

	Description *string `json:"description,omitempty"`
	// 功能说明：出入控制方向 取值范围： - egress：出方向 - ingress：入方向

	Direction string `json:"direction"`
	// 功能说明：IP地址协议类型 取值范围：IPv4,IPv6 约束：默认值为IPv4

	Ethertype *string `json:"ethertype,omitempty"`
	// 功能说明：协议类型 取值范围：tcp、udp、icmp或IP协议编号（0~255） 约束：为空表示支持所有协议

	Protocol *string `json:"protocol,omitempty"`
	// 功能说明：起始端口值 取值范围：1~65535 约束：不能大于port_range_max的值，为空表示所有端口，如果协议是icmp类型，取值范围请参见 [安全组规则icmp协议名称对应关系表](https://support.huaweicloud.com/api-vpc/vpc_api_0009.html)

	PortRangeMin *int32 `json:"port_range_min,omitempty"`
	// 功能说明：结束端口值 取值范围：1~65535 约束：协议不为icmp时，取值不能小于port_range_min的值，为空表示所有端口，如果协议是icmp类型，取值范围请参见 [安全组规则icmp协议名称对应关系表](https://support.huaweicloud.com/api-vpc/vpc_api_0009.html)

	PortRangeMax *int32 `json:"port_range_max,omitempty"`
	// 功能说明：远端IP地址，当direction是egress时为虚拟机访问端的地址，当direction是ingress时为访问虚拟机的地址 取值范围：IP地址，或者cidr格式 约束：和remote_group_id互斥

	RemoteIpPrefix *string `json:"remote_ip_prefix,omitempty"`
	// 功能说明：对端安全组ID 约束：和remote_ip_prefix互斥

	RemoteGroupId *string `json:"remote_group_id,omitempty"`
}

func (o CreateSecurityGroupRuleOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "CreateSecurityGroupRuleOption struct{}"
	}

	return strings.Join([]string{"CreateSecurityGroupRuleOption", string(data)}, " ")
}
