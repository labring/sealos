package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type NeutronFirewallPolicy struct {
	// 审计标记。

	Audited bool `json:"audited"`
	// 网络ACL防火墙策略描述。

	Description string `json:"description"`
	// 策略引用的网络ACL防火墙规则链。

	FirewallRules []string `json:"firewall_rules"`
	// 网络ACL防火墙策略uuid标识。

	Id string `json:"id"`
	// 网络ACL防火墙策略名称。

	Name string `json:"name"`
	// 是否支持跨租户共享。

	Public bool `json:"public"`
	// 项目ID

	TenantId string `json:"tenant_id"`
	// 项目ID

	ProjectId string `json:"project_id"`
}

func (o NeutronFirewallPolicy) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronFirewallPolicy struct{}"
	}

	return strings.Join([]string{"NeutronFirewallPolicy", string(data)}, " ")
}
