package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type DeleteSecurityGroupRuleResponse struct {
	HttpStatusCode int `json:"-"`
}

func (o DeleteSecurityGroupRuleResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "DeleteSecurityGroupRuleResponse struct{}"
	}

	return strings.Join([]string{"DeleteSecurityGroupRuleResponse", string(data)}, " ")
}
