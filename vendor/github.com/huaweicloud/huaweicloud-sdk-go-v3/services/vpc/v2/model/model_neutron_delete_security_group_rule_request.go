package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type NeutronDeleteSecurityGroupRuleRequest struct {
	// 安全组规则ID

	SecurityGroupRuleId string `json:"security_group_rule_id"`
}

func (o NeutronDeleteSecurityGroupRuleRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronDeleteSecurityGroupRuleRequest struct{}"
	}

	return strings.Join([]string{"NeutronDeleteSecurityGroupRuleRequest", string(data)}, " ")
}
