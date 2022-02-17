package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type ShowServerAutoRecoveryResponse struct {
	// 云服务器是否配置了自动恢复动作。  - true：表示配置了自动恢复。 - false：表示没有配置自动恢复。

	SupportAutoRecovery *string `json:"support_auto_recovery,omitempty"`
	HttpStatusCode      int     `json:"-"`
}

func (o ShowServerAutoRecoveryResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowServerAutoRecoveryResponse struct{}"
	}

	return strings.Join([]string{"ShowServerAutoRecoveryResponse", string(data)}, " ")
}
