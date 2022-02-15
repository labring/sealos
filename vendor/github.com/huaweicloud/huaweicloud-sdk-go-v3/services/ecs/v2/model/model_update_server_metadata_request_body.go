package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// This is a auto create Body Object
type UpdateServerMetadataRequestBody struct {
	// 用户自定义metadata键值对。  结构体允许为空，取值为空时不更新数据。  键。最大长度255个Unicode字符，不能为空。可以为大写字母（A-Z）、小写字母（a-z）、数字（0-9）、中划线（-）、下划线（_）、冒号（:）和小数点（.）。  值。最大长度为255个Unicode字符。

	Metadata map[string]string `json:"metadata"`
}

func (o UpdateServerMetadataRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "UpdateServerMetadataRequestBody struct{}"
	}

	return strings.Join([]string{"UpdateServerMetadataRequestBody", string(data)}, " ")
}
