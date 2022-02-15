package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type NeutronListFirewallGroupsRequest struct {
	// 分页查询起始的资源ID，为空时查询第一页

	Marker *string `json:"marker,omitempty"`
	// 每页返回的个数

	Limit *int32 `json:"limit,omitempty"`
	// 使用id过滤网络ACL组

	Id *[]string `json:"id,omitempty"`
	// 使用name过滤ACL组

	Name *[]string `json:"name,omitempty"`
	// 使用description过滤ACL组

	Description *[]string `json:"description,omitempty"`
	// 使用入方向的网络ACL策略ID过滤网络ACL组

	IngressFirewallPolicyId *string `json:"ingress_firewall_policy_id,omitempty"`
	// 使用出方向的网络ACL策略过滤查询网络ACL组

	EgressFirewallPolicyId *string `json:"egress_firewall_policy_id,omitempty"`
}

func (o NeutronListFirewallGroupsRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronListFirewallGroupsRequest struct{}"
	}

	return strings.Join([]string{"NeutronListFirewallGroupsRequest", string(data)}, " ")
}
