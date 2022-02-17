package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type NeutronUpdateFirewallGroupRequest struct {
	// 网络ACL防火墙组ID

	FirewallGroupId string `json:"firewall_group_id"`

	Body *NeutronUpdateFirewallGroupRequestBody `json:"body,omitempty"`
}

func (o NeutronUpdateFirewallGroupRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronUpdateFirewallGroupRequest struct{}"
	}

	return strings.Join([]string{"NeutronUpdateFirewallGroupRequest", string(data)}, " ")
}
