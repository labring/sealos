package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// 弹性云服务器故障信息。
type ServerFault struct {
	// 错误码。

	Code *int32 `json:"code,omitempty"`
	// 异常出现的时间。

	Created *string `json:"created,omitempty"`
	// 异常描述信息。

	Message *string `json:"message,omitempty"`
	// 异常详情信息。

	Details *string `json:"details,omitempty"`
}

func (o ServerFault) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ServerFault struct{}"
	}

	return strings.Join([]string{"ServerFault", string(data)}, " ")
}
