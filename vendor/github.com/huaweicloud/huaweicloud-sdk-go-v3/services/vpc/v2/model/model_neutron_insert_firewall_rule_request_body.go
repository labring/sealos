package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type NeutronInsertFirewallRuleRequestBody struct {
	// 功能说明：网络ACL规则ID

	FirewallRuleId string `json:"firewall_rule_id"`
	// insert_after参数表示已经和某个policy关联的rule，新的rule将会直接被插入到insert_after参数指定的rule后面。如果insert_after和insert_before都被指定了，insert_after参数值将被忽略。

	InsertAfter *string `json:"insert_after,omitempty"`
	// insert_before参数表示已经和某个policy关联的rule，新的firewall rule将会直接被插入到insert_ before参数指定的firewall rule前面。如果insert_after和insert_before都被指定了，insert_after参数值将被忽略。

	InsertBefore *string `json:"insert_before,omitempty"`
}

func (o NeutronInsertFirewallRuleRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronInsertFirewallRuleRequestBody struct{}"
	}

	return strings.Join([]string{"NeutronInsertFirewallRuleRequestBody", string(data)}, " ")
}
