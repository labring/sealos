package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type ShowServerBlockDeviceRequest struct {
	// 云服务器ID。

	ServerId string `json:"server_id"`
	// 云硬盘ID，UUID格式。

	VolumeId string `json:"volume_id"`
}

func (o ShowServerBlockDeviceRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowServerBlockDeviceRequest struct{}"
	}

	return strings.Join([]string{"ShowServerBlockDeviceRequest", string(data)}, " ")
}
