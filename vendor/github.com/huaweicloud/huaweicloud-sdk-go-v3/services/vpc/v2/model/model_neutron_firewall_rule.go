package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

//
type NeutronFirewallRule struct {
	// 功能说明：网络ACL规则的uuid标识。

	Id string `json:"id"`
	// 功能说明：网络ACL规则名称。 取值范围：0-255个字符

	Name string `json:"name"`
	// 功能说明：网络ACL规则描述 取值范围：0-255个字符长度

	Description string `json:"description"`
	// 功能说明：对通过网络ACL的流量执行的操作。 取值范围：DENY（拒绝）/ALLOW（允许）

	Action NeutronFirewallRuleAction `json:"action"`
	// 功能说明：IP协议 取值范围：支持TCP,UDP,ICMP, ICMPV6或者IP协议号（0-255）

	Protocol string `json:"protocol"`
	// 功能说明：IP协议版本 取值范围：Ipv4/Ipv6

	IpVersion int32 `json:"ip_version"`
	// 功能说明：是否使能网络ACL规则。 取值范围：true/false

	Enabled bool `json:"enabled"`
	// 功能说明：是否支持跨租户共享 取值范围：true/false

	Public bool `json:"public"`
	// 功能说明：目的地址或者CIDR。

	DestinationIpAddress string `json:"destination_ip_address"`
	// 功能说明：目的端口号或者一段端口范围。

	DestinationPort string `json:"destination_port"`
	// 功能说明：源地址或者CIDR。

	SourceIpAddress string `json:"source_ip_address"`
	// 功能说明：源端口号或者一段端口范围。

	SourcePort string `json:"source_port"`
	// 功能说明：项目ID

	TenantId string `json:"tenant_id"`
	// 功能说明：项目ID

	ProjectId string `json:"project_id"`
}

func (o NeutronFirewallRule) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronFirewallRule struct{}"
	}

	return strings.Join([]string{"NeutronFirewallRule", string(data)}, " ")
}

type NeutronFirewallRuleAction struct {
	value string
}

type NeutronFirewallRuleActionEnum struct {
	DENY  NeutronFirewallRuleAction
	ALLOW NeutronFirewallRuleAction
}

func GetNeutronFirewallRuleActionEnum() NeutronFirewallRuleActionEnum {
	return NeutronFirewallRuleActionEnum{
		DENY: NeutronFirewallRuleAction{
			value: "DENY",
		},
		ALLOW: NeutronFirewallRuleAction{
			value: "ALLOW",
		},
	}
}

func (c NeutronFirewallRuleAction) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *NeutronFirewallRuleAction) UnmarshalJSON(b []byte) error {
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
