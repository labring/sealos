package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type NeutronDeleteFirewallRuleRequest struct {
	// 网络ACL防火墙规则ID

	FirewallRuleId string `json:"firewall_rule_id"`
}

func (o NeutronDeleteFirewallRuleRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronDeleteFirewallRuleRequest struct{}"
	}

	return strings.Join([]string{"NeutronDeleteFirewallRuleRequest", string(data)}, " ")
}
