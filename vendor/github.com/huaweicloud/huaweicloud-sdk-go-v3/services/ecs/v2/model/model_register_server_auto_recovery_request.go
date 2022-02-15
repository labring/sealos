package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type RegisterServerAutoRecoveryRequest struct {
	// 云服务器ID。

	ServerId string `json:"server_id"`

	Body *RegisterServerAutoRecoveryRequestBody `json:"body,omitempty"`
}

func (o RegisterServerAutoRecoveryRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "RegisterServerAutoRecoveryRequest struct{}"
	}

	return strings.Join([]string{"RegisterServerAutoRecoveryRequest", string(data)}, " ")
}
