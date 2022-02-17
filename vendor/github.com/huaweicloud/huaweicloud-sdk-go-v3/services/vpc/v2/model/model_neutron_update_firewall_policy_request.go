package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type NeutronUpdateFirewallPolicyRequest struct {
	// 网络ACL防火墙策略ID

	FirewallPolicyId string `json:"firewall_policy_id"`

	Body *NeutronUpdateFirewallPolicyRequestBody `json:"body,omitempty"`
}

func (o NeutronUpdateFirewallPolicyRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronUpdateFirewallPolicyRequest struct{}"
	}

	return strings.Join([]string{"NeutronUpdateFirewallPolicyRequest", string(data)}, " ")
}
