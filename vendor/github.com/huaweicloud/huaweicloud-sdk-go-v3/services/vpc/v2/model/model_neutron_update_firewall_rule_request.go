package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type NeutronUpdateFirewallRuleRequest struct {
	// 网络ACL防火墙规则ID

	FirewallRuleId string `json:"firewall_rule_id"`

	Body *NeutronUpdateFirewallRuleRequestBody `json:"body,omitempty"`
}

func (o NeutronUpdateFirewallRuleRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronUpdateFirewallRuleRequest struct{}"
	}

	return strings.Join([]string{"NeutronUpdateFirewallRuleRequest", string(data)}, " ")
}
