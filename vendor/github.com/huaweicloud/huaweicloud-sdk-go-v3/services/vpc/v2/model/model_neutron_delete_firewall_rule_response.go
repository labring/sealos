package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type NeutronDeleteFirewallRuleResponse struct {
	HttpStatusCode int `json:"-"`
}

func (o NeutronDeleteFirewallRuleResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronDeleteFirewallRuleResponse struct{}"
	}

	return strings.Join([]string{"NeutronDeleteFirewallRuleResponse", string(data)}, " ")
}
