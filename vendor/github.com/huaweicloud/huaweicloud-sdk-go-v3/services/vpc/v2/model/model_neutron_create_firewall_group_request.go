package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type NeutronCreateFirewallGroupRequest struct {
	Body *NeutronCreateFirewallGroupRequestBody `json:"body,omitempty"`
}

func (o NeutronCreateFirewallGroupRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronCreateFirewallGroupRequest struct{}"
	}

	return strings.Join([]string{"NeutronCreateFirewallGroupRequest", string(data)}, " ")
}
