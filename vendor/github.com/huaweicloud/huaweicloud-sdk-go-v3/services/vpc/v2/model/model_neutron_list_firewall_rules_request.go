package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type NeutronListFirewallRulesRequest struct {
	// 分页查询起始的资源ID，为空时查询第一页

	Marker *string `json:"marker,omitempty"`
	// 每页返回的个数

	Limit *int32 `json:"limit,omitempty"`
	// 使用网络ACL规则ID过滤网络ACL规则

	Id *[]string `json:"id,omitempty"`
	// 使用网络ACL规则name过滤网络ACL规则

	Name *[]string `json:"name,omitempty"`
	// 使用网络ACL规则的description过滤网络ACL规则

	Description *[]string `json:"description,omitempty"`
	// 使用action过滤查询网络ACL规则

	Action *string `json:"action,omitempty"`
	// 使用tenant_id过滤查询网络ACL规则

	TenantId *string `json:"tenant_id,omitempty"`
}

func (o NeutronListFirewallRulesRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronListFirewallRulesRequest struct{}"
	}

	return strings.Join([]string{"NeutronListFirewallRulesRequest", string(data)}, " ")
}
