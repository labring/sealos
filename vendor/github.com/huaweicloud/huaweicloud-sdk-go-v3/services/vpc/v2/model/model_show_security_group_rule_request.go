package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type ShowSecurityGroupRuleRequest struct {
	// 安全组规则ID

	SecurityGroupRuleId string `json:"security_group_rule_id"`
}

func (o ShowSecurityGroupRuleRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowSecurityGroupRuleRequest struct{}"
	}

	return strings.Join([]string{"ShowSecurityGroupRuleRequest", string(data)}, " ")
}
