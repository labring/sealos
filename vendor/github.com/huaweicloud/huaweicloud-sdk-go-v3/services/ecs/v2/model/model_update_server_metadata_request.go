package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type UpdateServerMetadataRequest struct {
	// 云服务器ID。

	ServerId string `json:"server_id"`

	Body *UpdateServerMetadataRequestBody `json:"body,omitempty"`
}

func (o UpdateServerMetadataRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "UpdateServerMetadataRequest struct{}"
	}

	return strings.Join([]string{"UpdateServerMetadataRequest", string(data)}, " ")
}
