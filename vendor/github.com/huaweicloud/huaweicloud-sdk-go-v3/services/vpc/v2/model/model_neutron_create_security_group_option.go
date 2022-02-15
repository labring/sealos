package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type NeutronCreateSecurityGroupOption struct {
	// 功能说明：安全组描述 取值范围：0-255个字符

	Description *string `json:"description,omitempty"`
	// 功能说明：安全组名称 取值范围：0-255个字符 约束：不允许为“default”

	Name *string `json:"name,omitempty"`
}

func (o NeutronCreateSecurityGroupOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronCreateSecurityGroupOption struct{}"
	}

	return strings.Join([]string{"NeutronCreateSecurityGroupOption", string(data)}, " ")
}
