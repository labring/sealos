package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type CreateSecurityGroupOption struct {
	// 功能说明：安全组名称 取值范围：1-64个字符，支持数字、字母、中文、_(下划线)、-（中划线）、.（点）

	Name string `json:"name"`
	// 功能说明：安全组所在的vpc的资源标识

	VpcId *string `json:"vpc_id,omitempty"`
	// 功能说明：企业项目ID。创建安全组时，给安全组绑定企业项目ID。 取值范围：最大长度36字节，带“-”连字符的UUID格式，或者是字符串“0”。“0”表示默认企业项目。 默认值：“0”

	EnterpriseProjectId *string `json:"enterprise_project_id,omitempty"`
}

func (o CreateSecurityGroupOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "CreateSecurityGroupOption struct{}"
	}

	return strings.Join([]string{"CreateSecurityGroupOption", string(data)}, " ")
}
