package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type ShowServerRequest struct {
	// 云服务器ID。

	ServerId string `json:"server_id"`
}

func (o ShowServerRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowServerRequest struct{}"
	}

	return strings.Join([]string{"ShowServerRequest", string(data)}, " ")
}
