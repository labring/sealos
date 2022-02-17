package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type NeutronShowSecurityGroupRuleRequest struct {
	// 安全组规则ID

	SecurityGroupRuleId string `json:"security_group_rule_id"`
}

func (o NeutronShowSecurityGroupRuleRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronShowSecurityGroupRuleRequest struct{}"
	}

	return strings.Join([]string{"NeutronShowSecurityGroupRuleRequest", string(data)}, " ")
}
