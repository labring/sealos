package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// 更新peering对象
type UpdateVpcPeeringOption struct {
	// 功能说明：对等连接名称 取值范围：支持1~64个字符

	Name *string `json:"name,omitempty"`
	// 功能说明：对等连接描述 取值范围：0-255个字符，支持数字、字母、中文字符

	Description *string `json:"description,omitempty"`
}

func (o UpdateVpcPeeringOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "UpdateVpcPeeringOption struct{}"
	}

	return strings.Join([]string{"UpdateVpcPeeringOption", string(data)}, " ")
}
