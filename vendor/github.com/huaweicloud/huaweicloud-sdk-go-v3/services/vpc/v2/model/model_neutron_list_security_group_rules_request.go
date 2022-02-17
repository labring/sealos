package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type NeutronListSecurityGroupRulesRequest struct {
	// 每页返回的个数

	Limit *int32 `json:"limit,omitempty"`
	// 分页查询起始的资源ID，为空时查询第一页

	Marker *string `json:"marker,omitempty"`
	// 按照安全组规则对应的id过滤查询结果

	Id *string `json:"id,omitempty"`
	// 按照安全组规则的方向过滤查询结果，支持ingress和egress进行过滤

	Direction *string `json:"direction,omitempty"`
	// 按照安全组规则的IP协议过滤查询结果

	Protocol *string `json:"protocol,omitempty"`
	// 按照网络类型过滤查询结果，支持IPv4或者IPv6

	Ethertype *string `json:"ethertype,omitempty"`
	// 按照安全组规则的描述过滤查询结果

	Description *string `json:"description,omitempty"`
	// 按照与此安全组规则匹配的远端IP网段过滤查询结果

	RemoteIpPrefix *string `json:"remote_ip_prefix,omitempty"`
	// 按照与此安全组规则关联的远端安全组ID过滤查询结果

	RemoteGroupId *string `json:"remote_group_id,omitempty"`
	// 按照与此安全组规则所属的安全组ID过滤查询结果

	SecurityGroupId *string `json:"security_group_id,omitempty"`
	// 按照最大端口过滤查询结果

	PortRangeMax *string `json:"port_range_max,omitempty"`
	// 按照最小端口过滤查询结果

	PortRangeMin *string `json:"port_range_min,omitempty"`
	// 按照安全组规则所属的项目ID过滤查询结果

	TenantId *string `json:"tenant_id,omitempty"`
}

func (o NeutronListSecurityGroupRulesRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronListSecurityGroupRulesRequest struct{}"
	}

	return strings.Join([]string{"NeutronListSecurityGroupRulesRequest", string(data)}, " ")
}
