package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// This is a auto create Body Object
type RegisterServerAutoRecoveryRequestBody struct {
	// 云服务器是否配置了自动恢复动作。  - true：表示配置自动恢复。 - false：表示删除自动恢复。

	SupportAutoRecovery string `json:"support_auto_recovery"`
}

func (o RegisterServerAutoRecoveryRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "RegisterServerAutoRecoveryRequestBody struct{}"
	}

	return strings.Join([]string{"RegisterServerAutoRecoveryRequestBody", string(data)}, " ")
}
