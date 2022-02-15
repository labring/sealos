package model

import (
	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/sdktime"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"
	"strings"
)

//
type NeutronSecurityGroupRule struct {
	// 安全组规则描述

	Description string `json:"description"`
	// 功能说明：规则方向 取值范围：ingress、egress

	Direction NeutronSecurityGroupRuleDirection `json:"direction"`
	// 功能说明：网络类型 取值范围：IPv4、IPv6

	Ethertype string `json:"ethertype"`
	// 安全组规则ID，查询安全组规则非必选

	Id string `json:"id"`
	// 功能说明：最大端口 取值范围：当协议类型为ICMP时，该值表示ICMP的code

	PortRangeMax int32 `json:"port_range_max"`
	// 功能说明：最小端口 当协议类型为ICMP时，该值表示ICMP的type。protocol为tcp和udp时，port_range_max和port_range_min必须同时输入，且port_range_max应大于等于port_range_min。protocol为icmp时，指定ICMP code（port_range_max）时，必须同时指定ICMP type（port_range_min）。

	PortRangeMin int32 `json:"port_range_min"`
	// 功能说明：tcp/udp/icmp/icmpv6或IP协议编号（0~255） 约束：协议为icmpv6时，网络类型应该为IPv6；协议为icmp时，网络类型应该为IPv4

	Protocol string `json:"protocol"`
	// 所属安全组的对端ID

	RemoteGroupId string `json:"remote_group_id"`
	// 对端ip网段

	RemoteIpPrefix string `json:"remote_ip_prefix"`
	// 所属安全组ID

	SecurityGroupId string `json:"security_group_id"`
	// 项目ID

	TenantId string `json:"tenant_id"`
	// 项目ID

	ProjectId string `json:"project_id"`
	// 功能说明：资源创建UTC时间 格式：yyyy-MM-ddTHH:mm:ss

	CreatedAt *sdktime.SdkTime `json:"created_at"`
	// 功能说明：资源更新UTC时间 格式：yyyy-MM-ddTHH:mm:ss

	UpdatedAt *sdktime.SdkTime `json:"updated_at"`
}

func (o NeutronSecurityGroupRule) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronSecurityGroupRule struct{}"
	}

	return strings.Join([]string{"NeutronSecurityGroupRule", string(data)}, " ")
}

type NeutronSecurityGroupRuleDirection struct {
	value string
}

type NeutronSecurityGroupRuleDirectionEnum struct {
	INGRESS NeutronSecurityGroupRuleDirection
	EGRESS  NeutronSecurityGroupRuleDirection
}

func GetNeutronSecurityGroupRuleDirectionEnum() NeutronSecurityGroupRuleDirectionEnum {
	return NeutronSecurityGroupRuleDirectionEnum{
		INGRESS: NeutronSecurityGroupRuleDirection{
			value: "ingress",
		},
		EGRESS: NeutronSecurityGroupRuleDirection{
			value: "egress",
		},
	}
}

func (c NeutronSecurityGroupRuleDirection) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *NeutronSecurityGroupRuleDirection) UnmarshalJSON(b []byte) error {
	myConverter := converter.StringConverterFactory("string")
	if myConverter != nil {
		val, err := myConverter.CovertStringToInterface(strings.Trim(string(b[:]), "\""))
		if err == nil {
			c.value = val.(string)
			return nil
		}
		return err
	} else {
		return errors.New("convert enum data to string error")
	}
}
