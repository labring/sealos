package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

//
type NeutronCreateSecurityGroupRuleOption struct {
	// 功能说明：安全组规则描述 取值范围：0-255个字符

	Description *string `json:"description,omitempty"`
	// 功能说明：安全组规则方向 取值范围：ingress(入方向)或egress(出方向)

	Direction NeutronCreateSecurityGroupRuleOptionDirection `json:"direction"`
	// 功能说明：安全组规则网络类型 取值范围：IPv4或IPv6

	Ethertype *NeutronCreateSecurityGroupRuleOptionEthertype `json:"ethertype,omitempty"`
	// 最大端口，当协议类型为ICMP时，该值表示ICMP的code

	PortRangeMax *int32 `json:"port_range_max,omitempty"`
	// 功能说明：最小端口，当协议类型为ICMP时，该值表示ICMP的type 约束：protocol为tcp和udp时，port_range_max和port_range_min必须同时输入，且port_range_max应大于等于port_range_min。protocol为icmp时，指定ICMP code（port_range_max）时，必须同时指定ICMP type（port_range_min）。

	PortRangeMin *int32 `json:"port_range_min,omitempty"`
	// 功能说明：tcp/udp/icmp/icmpv6或IP协议编号（0~255） 约束：协议为icmpv6时，网络类型应该为IPv6；协议为icmp时，网络类型应该为IPv4

	Protocol *string `json:"protocol,omitempty"`
	// 功能说明：目的安全组的ID

	RemoteGroupId *string `json:"remote_group_id,omitempty"`
	// 功能说明：目的端ip网段 取值范围：cidr格式，如10.10.0.0/16

	RemoteIpPrefix *string `json:"remote_ip_prefix,omitempty"`
	// 所属安全组ID

	SecurityGroupId string `json:"security_group_id"`
}

func (o NeutronCreateSecurityGroupRuleOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronCreateSecurityGroupRuleOption struct{}"
	}

	return strings.Join([]string{"NeutronCreateSecurityGroupRuleOption", string(data)}, " ")
}

type NeutronCreateSecurityGroupRuleOptionDirection struct {
	value string
}

type NeutronCreateSecurityGroupRuleOptionDirectionEnum struct {
	INGRESS NeutronCreateSecurityGroupRuleOptionDirection
	EGRESS  NeutronCreateSecurityGroupRuleOptionDirection
}

func GetNeutronCreateSecurityGroupRuleOptionDirectionEnum() NeutronCreateSecurityGroupRuleOptionDirectionEnum {
	return NeutronCreateSecurityGroupRuleOptionDirectionEnum{
		INGRESS: NeutronCreateSecurityGroupRuleOptionDirection{
			value: "ingress",
		},
		EGRESS: NeutronCreateSecurityGroupRuleOptionDirection{
			value: "egress",
		},
	}
}

func (c NeutronCreateSecurityGroupRuleOptionDirection) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *NeutronCreateSecurityGroupRuleOptionDirection) UnmarshalJSON(b []byte) error {
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

type NeutronCreateSecurityGroupRuleOptionEthertype struct {
	value string
}

type NeutronCreateSecurityGroupRuleOptionEthertypeEnum struct {
	I_PV4 NeutronCreateSecurityGroupRuleOptionEthertype
	I_PV6 NeutronCreateSecurityGroupRuleOptionEthertype
}

func GetNeutronCreateSecurityGroupRuleOptionEthertypeEnum() NeutronCreateSecurityGroupRuleOptionEthertypeEnum {
	return NeutronCreateSecurityGroupRuleOptionEthertypeEnum{
		I_PV4: NeutronCreateSecurityGroupRuleOptionEthertype{
			value: "IPv4",
		},
		I_PV6: NeutronCreateSecurityGroupRuleOptionEthertype{
			value: "IPv6",
		},
	}
}

func (c NeutronCreateSecurityGroupRuleOptionEthertype) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *NeutronCreateSecurityGroupRuleOptionEthertype) UnmarshalJSON(b []byte) error {
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
