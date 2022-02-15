package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type ReinstallServerWithoutCloudInitRequest struct {
	// 云服务器ID。

	ServerId string `json:"server_id"`

	Body *ReinstallServerWithoutCloudInitRequestBody `json:"body,omitempty"`
}

func (o ReinstallServerWithoutCloudInitRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ReinstallServerWithoutCloudInitRequest struct{}"
	}

	return strings.Join([]string{"ReinstallServerWithoutCloudInitRequest", string(data)}, " ")
}
