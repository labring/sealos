package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type ShowServerAutoRecoveryRequest struct {
	// 云服务器ID。

	ServerId string `json:"server_id"`
}

func (o ShowServerAutoRecoveryRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowServerAutoRecoveryRequest struct{}"
	}

	return strings.Join([]string{"ShowServerAutoRecoveryRequest", string(data)}, " ")
}
