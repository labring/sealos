package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type NeutronCreateFirewallPolicyRequest struct {
	Body *NeutronCreateFirewallPolicyRequestBody `json:"body,omitempty"`
}

func (o NeutronCreateFirewallPolicyRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronCreateFirewallPolicyRequest struct{}"
	}

	return strings.Join([]string{"NeutronCreateFirewallPolicyRequest", string(data)}, " ")
}
