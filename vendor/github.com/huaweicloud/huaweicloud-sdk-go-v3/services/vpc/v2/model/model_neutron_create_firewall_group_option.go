package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type NeutronCreateFirewallGroupOption struct {
	// 功能说明：网络ACL组名称 取值范围：0-255个字符

	Name *string `json:"name,omitempty"`
	// 功能说明：网络ACL防火墙组描述 取值范围：最长255个字符

	Description *string `json:"description,omitempty"`
	// 功能说明：入方向网络ACL策略

	IngressFirewallPolicyId *string `json:"ingress_firewall_policy_id,omitempty"`
	// 功能说明：出方向网络ACL策略

	EgressFirewallPolicyId *string `json:"egress_firewall_policy_id,omitempty"`
	// 功能说明：网络ACL防火墙组绑定的端口列表 约束：必须为分布式router的端口id

	Ports *[]string `json:"ports,omitempty"`
	// 功能说明：网络ACL是否受管理员控制

	AdminStateUp *bool `json:"admin_state_up,omitempty"`
}

func (o NeutronCreateFirewallGroupOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronCreateFirewallGroupOption struct{}"
	}

	return strings.Join([]string{"NeutronCreateFirewallGroupOption", string(data)}, " ")
}
