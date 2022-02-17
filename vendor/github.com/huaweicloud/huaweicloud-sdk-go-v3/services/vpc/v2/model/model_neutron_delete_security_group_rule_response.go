package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type NeutronDeleteSecurityGroupRuleResponse struct {
	HttpStatusCode int `json:"-"`
}

func (o NeutronDeleteSecurityGroupRuleResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronDeleteSecurityGroupRuleResponse struct{}"
	}

	return strings.Join([]string{"NeutronDeleteSecurityGroupRuleResponse", string(data)}, " ")
}
