package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type NeutronDeleteFirewallGroupRequest struct {
	// 网络ACL防火墙组ID

	FirewallGroupId string `json:"firewall_group_id"`
}

func (o NeutronDeleteFirewallGroupRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronDeleteFirewallGroupRequest struct{}"
	}

	return strings.Join([]string{"NeutronDeleteFirewallGroupRequest", string(data)}, " ")
}
