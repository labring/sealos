package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type NeutronListFirewallGroupsResponse struct {
	// firewall_group对象列表

	FirewallGroups *[]NeutronFirewallGroup `json:"firewall_groups,omitempty"`
	// 分页信息

	FirewallGroupsLinks *[]NeutronPageLink `json:"firewall_groups_links,omitempty"`
	HttpStatusCode      int                `json:"-"`
}

func (o NeutronListFirewallGroupsResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronListFirewallGroupsResponse struct{}"
	}

	return strings.Join([]string{"NeutronListFirewallGroupsResponse", string(data)}, " ")
}
