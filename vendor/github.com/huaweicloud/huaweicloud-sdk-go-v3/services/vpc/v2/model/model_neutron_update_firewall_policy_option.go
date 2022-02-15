package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type NeutronUpdateFirewallPolicyOption struct {
	// 功能说明：网络ACL防火墙策略名称 取值范围：最长255个字符

	Name *string `json:"name,omitempty"`
	// 功能说明：网络ACL防火墙策略描述 取值范围：最长255个字符

	Description *string `json:"description,omitempty"`
	// 功能说明：网络ACL策略关联的规则列表

	FirewallRules *[]string `json:"firewall_rules,omitempty"`
	// 审计标记。

	Audited *bool `json:"audited,omitempty"`
}

func (o NeutronUpdateFirewallPolicyOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronUpdateFirewallPolicyOption struct{}"
	}

	return strings.Join([]string{"NeutronUpdateFirewallPolicyOption", string(data)}, " ")
}
