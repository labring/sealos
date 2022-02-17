package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type NovaSecurityGroupCommonRule struct {
	// 起始端口，范围1-65535，且不大于to_port。 ip_protocol设置为icmp时，from_port表示type，范围是0-255。

	FromPort int32 `json:"from_port"`

	Group *NovaSecurityGroupCommonGroup `json:"group"`
	// 安全组规则ID，UUID格式。

	Id string `json:"id"`
	// 协议类型或直接指定IP协议号，取值可为icmp，tcp，udp或IP协议号。

	IpProtocol string `json:"ip_protocol"`

	IpRange *NovaSecurityGroupCommonIpRange `json:"ip_range"`
	// 相关联的安全组ID，UUID格式。

	ParentGroupId string `json:"parent_group_id"`
	// 终止端口，范围1-65535，且不小于from_port。 ip_protocol设置为icmp时，to_port表示code，范围是0-255，且如果from_port为-1，to_port为-1表示任意ICMP报文。

	ToPort int32 `json:"to_port"`
}

func (o NovaSecurityGroupCommonRule) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaSecurityGroupCommonRule struct{}"
	}

	return strings.Join([]string{"NovaSecurityGroupCommonRule", string(data)}, " ")
}
