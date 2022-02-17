package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/sdktime"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type NeutronFirewallGroup struct {
	// 功能说明：网络ACL组的ID

	Id string `json:"id"`
	// 功能说明：网络ACL组名称 取值范围：0-255个字符

	Name string `json:"name"`
	// 功能说明：网络ACL组描述 取值范围：0-255个字符

	Description string `json:"description"`
	// 网络ACL防火墙是否受管理员控制。

	AdminStateUp bool `json:"admin_state_up"`
	// 功能说明：出方向网络ACL策略ID

	EgressFirewallPolicyId string `json:"egress_firewall_policy_id"`
	// 功能说明：入方向网络ACL策略ID

	IngressFirewallPolicyId string `json:"ingress_firewall_policy_id"`
	// 取值范围：网络ACL组绑定的端口列表

	Ports []string `json:"ports"`
	// 功能说明：是否支持跨租户共享 取值范围：true/false

	Public bool `json:"public"`
	// 功能说明：网络ACL组状态

	Status string `json:"status"`
	// 功能说明：网络ACL组所属项目ID

	TenantId string `json:"tenant_id"`
	// 功能说明：网络ACL组所属项目ID

	ProjectId string `json:"project_id"`
	// 功能说明：资源创建时间，UTC时间 格式：yyyy-MM-ddTHH:mm:ss

	CreatedAt *sdktime.SdkTime `json:"created_at"`
	// 功能说明：资源更新时间，UTC时间 格式：yyyy-MM-ddTHH:mm:ss

	UpdatedAt *sdktime.SdkTime `json:"updated_at"`
}

func (o NeutronFirewallGroup) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronFirewallGroup struct{}"
	}

	return strings.Join([]string{"NeutronFirewallGroup", string(data)}, " ")
}
