package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type NeutronShowFirewallGroupRequest struct {
	// 网络ACL防火墙组ID

	FirewallGroupId string `json:"firewall_group_id"`
}

func (o NeutronShowFirewallGroupRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronShowFirewallGroupRequest struct{}"
	}

	return strings.Join([]string{"NeutronShowFirewallGroupRequest", string(data)}, " ")
}
