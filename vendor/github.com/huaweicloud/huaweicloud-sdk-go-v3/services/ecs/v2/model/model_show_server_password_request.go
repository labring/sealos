package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type ShowServerPasswordRequest struct {
	// 云服务器ID。

	ServerId string `json:"server_id"`
}

func (o ShowServerPasswordRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowServerPasswordRequest struct{}"
	}

	return strings.Join([]string{"ShowServerPasswordRequest", string(data)}, " ")
}
