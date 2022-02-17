package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type DeleteServerMetadataRequest struct {
	// 待删除的云服务器metadata键值

	Key string `json:"key"`
	// 云服务器ID。

	ServerId string `json:"server_id"`
}

func (o DeleteServerMetadataRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "DeleteServerMetadataRequest struct{}"
	}

	return strings.Join([]string{"DeleteServerMetadataRequest", string(data)}, " ")
}
