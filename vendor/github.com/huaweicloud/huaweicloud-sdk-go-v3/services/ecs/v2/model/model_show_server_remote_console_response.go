package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type ShowServerRemoteConsoleResponse struct {
	RemoteConsole  *ServerRemoteConsole `json:"remote_console,omitempty"`
	HttpStatusCode int                  `json:"-"`
}

func (o ShowServerRemoteConsoleResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowServerRemoteConsoleResponse struct{}"
	}

	return strings.Join([]string{"ShowServerRemoteConsoleResponse", string(data)}, " ")
}
