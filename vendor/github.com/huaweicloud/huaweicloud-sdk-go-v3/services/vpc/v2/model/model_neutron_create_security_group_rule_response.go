package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type NeutronCreateSecurityGroupRuleResponse struct {
	SecurityGroupRule *NeutronSecurityGroupRule `json:"security_group_rule,omitempty"`
	HttpStatusCode    int                       `json:"-"`
}

func (o NeutronCreateSecurityGroupRuleResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronCreateSecurityGroupRuleResponse struct{}"
	}

	return strings.Join([]string{"NeutronCreateSecurityGroupRuleResponse", string(data)}, " ")
}
