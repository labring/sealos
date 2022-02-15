package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type NeutronUpdateFirewallGroupOption struct {
	// 网络ACL防火墙是否受管理员控制。

	AdminStateUp *bool `json:"admin_state_up,omitempty"`
	// 功能说明：网络ACL防火墙组描述 取值范围：最长255个字符

	Description *string `json:"description,omitempty"`
	// 出方向网络ACL防火墙策略。

	EgressFirewallPolicyId *string `json:"egress_firewall_policy_id,omitempty"`
	// 入方向网络ACL防火墙策略。

	IngressFirewallPolicyId *string `json:"ingress_firewall_policy_id,omitempty"`
	// 功能说明：网络ACL防火墙组名称 取值范围：最长255个字符

	Name *string `json:"name,omitempty"`
	// 功能说明：网络ACL防火墙组绑定的端口列表 约束：必须为分布式router的端口id

	Ports *[]string `json:"ports,omitempty"`
}

func (o NeutronUpdateFirewallGroupOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronUpdateFirewallGroupOption struct{}"
	}

	return strings.Join([]string{"NeutronUpdateFirewallGroupOption", string(data)}, " ")
}
