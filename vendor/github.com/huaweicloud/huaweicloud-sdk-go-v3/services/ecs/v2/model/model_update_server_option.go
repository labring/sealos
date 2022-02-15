package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// 更新云服务器Body体。
type UpdateServerOption struct {
	// 修改后的云服务器名称。  只能由中文字符、英文字母、数字及“_”、“-”、“.”组成，且长度为[1-64]个字符。

	Name *string `json:"name,omitempty"`
	// 对弹性云服务器的任意描述。  不能包含“<”,“>”，且长度范围为[0-85]个字符。

	Description *string `json:"description,omitempty"`
	// 修改云服务hostname。  命令规范：长度为 [1-64] 个字符，允许使用点号(.)分隔字符成多段，每段允许使用大小写字母、数字或连字符(-)，但不能连续使用点号(.)或连字符(-),不能以点号(.)或连字符(-)开头或结尾，不能出现（.-）和（-.）。

	Hostname *string `json:"hostname,omitempty"`
}

func (o UpdateServerOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "UpdateServerOption struct{}"
	}

	return strings.Join([]string{"UpdateServerOption", string(data)}, " ")
}
