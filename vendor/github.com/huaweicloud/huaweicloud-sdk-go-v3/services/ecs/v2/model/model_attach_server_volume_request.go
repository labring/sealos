package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type AttachServerVolumeRequest struct {
	// 云服务器ID。

	ServerId string `json:"server_id"`

	Body *AttachServerVolumeRequestBody `json:"body,omitempty"`
}

func (o AttachServerVolumeRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "AttachServerVolumeRequest struct{}"
	}

	return strings.Join([]string{"AttachServerVolumeRequest", string(data)}, " ")
}
