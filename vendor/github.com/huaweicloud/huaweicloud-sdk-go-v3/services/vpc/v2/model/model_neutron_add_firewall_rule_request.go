package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type NeutronAddFirewallRuleRequest struct {
	// 网络ACL防火墙策略ID

	FirewallPolicyId string `json:"firewall_policy_id"`

	Body *NeutronInsertFirewallRuleRequestBody `json:"body,omitempty"`
}

func (o NeutronAddFirewallRuleRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronAddFirewallRuleRequest struct{}"
	}

	return strings.Join([]string{"NeutronAddFirewallRuleRequest", string(data)}, " ")
}
