package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type NeutronUpdateFirewallRuleRequestBody struct {
	FirewallRule *NeutronUpdateFirewallRuleOption `json:"firewall_rule"`
}

func (o NeutronUpdateFirewallRuleRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronUpdateFirewallRuleRequestBody struct{}"
	}

	return strings.Join([]string{"NeutronUpdateFirewallRuleRequestBody", string(data)}, " ")
}
