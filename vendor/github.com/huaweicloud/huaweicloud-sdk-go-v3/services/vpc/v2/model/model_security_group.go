package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type SecurityGroup struct {
	// 安全组名称

	Name string `json:"name"`
	// 安全组描述

	Description *string `json:"description,omitempty"`
	// 安全组唯一标识

	Id string `json:"id"`
	// 安全组所在的vpc的资源标识

	VpcId *string `json:"vpc_id,omitempty"`
	// 功能说明：企业项目ID。 取值范围：最大长度36字节，带“-”连字符的UUID格式，或者是字符串“0”。“0”表示默认企业项目。

	EnterpriseProjectId *string `json:"enterprise_project_id,omitempty"`
	// 安全组规则

	SecurityGroupRules []SecurityGroupRule `json:"security_group_rules"`
}

func (o SecurityGroup) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "SecurityGroup struct{}"
	}

	return strings.Join([]string{"SecurityGroup", string(data)}, " ")
}
