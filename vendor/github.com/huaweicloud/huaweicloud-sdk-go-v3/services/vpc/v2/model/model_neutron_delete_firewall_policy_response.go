package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type NeutronDeleteFirewallPolicyResponse struct {
	HttpStatusCode int `json:"-"`
}

func (o NeutronDeleteFirewallPolicyResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronDeleteFirewallPolicyResponse struct{}"
	}

	return strings.Join([]string{"NeutronDeleteFirewallPolicyResponse", string(data)}, " ")
}
