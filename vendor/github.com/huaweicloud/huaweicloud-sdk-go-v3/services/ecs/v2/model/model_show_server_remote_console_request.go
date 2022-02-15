package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type ShowServerRemoteConsoleRequest struct {
	// 云服务器ID。

	ServerId string `json:"server_id"`

	Body *ShowServerRemoteConsoleRequestBody `json:"body,omitempty"`
}

func (o ShowServerRemoteConsoleRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowServerRemoteConsoleRequest struct{}"
	}

	return strings.Join([]string{"ShowServerRemoteConsoleRequest", string(data)}, " ")
}
