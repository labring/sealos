package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// This is a auto create Body Object
type CreateServersRequestBody struct {
	// 是否只预检此次请求。  true：发送检查请求，不会创建实例。检查项包括是否填写了必需参数、请求格式等。 如果检查不通过，则返回对应错误。 如果检查通过，则返回202状态码。 false：发送正常请求，通过检查后并且执行创建云服务器请求。

	DryRun *bool `json:"dry_run,omitempty"`

	Server *PrePaidServer `json:"server"`
}

func (o CreateServersRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "CreateServersRequestBody struct{}"
	}

	return strings.Join([]string{"CreateServersRequestBody", string(data)}, " ")
}
