package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type BatchDeleteServerNicsRequest struct {
	// 云服务器ID。

	ServerId string `json:"server_id"`

	Body *BatchDeleteServerNicsRequestBody `json:"body,omitempty"`
}

func (o BatchDeleteServerNicsRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "BatchDeleteServerNicsRequest struct{}"
	}

	return strings.Join([]string{"BatchDeleteServerNicsRequest", string(data)}, " ")
}
