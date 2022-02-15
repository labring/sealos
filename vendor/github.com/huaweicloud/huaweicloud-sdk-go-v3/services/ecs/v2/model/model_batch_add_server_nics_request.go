package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type BatchAddServerNicsRequest struct {
	// 云服务器ID。

	ServerId string `json:"server_id"`

	Body *BatchAddServerNicsRequestBody `json:"body,omitempty"`
}

func (o BatchAddServerNicsRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "BatchAddServerNicsRequest struct{}"
	}

	return strings.Join([]string{"BatchAddServerNicsRequest", string(data)}, " ")
}
