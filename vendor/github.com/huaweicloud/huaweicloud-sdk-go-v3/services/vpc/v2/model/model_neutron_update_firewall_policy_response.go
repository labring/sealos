package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type NeutronUpdateFirewallPolicyResponse struct {
	FirewallPolicy *NeutronFirewallPolicy `json:"firewall_policy,omitempty"`
	HttpStatusCode int                    `json:"-"`
}

func (o NeutronUpdateFirewallPolicyResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronUpdateFirewallPolicyResponse struct{}"
	}

	return strings.Join([]string{"NeutronUpdateFirewallPolicyResponse", string(data)}, " ")
}
