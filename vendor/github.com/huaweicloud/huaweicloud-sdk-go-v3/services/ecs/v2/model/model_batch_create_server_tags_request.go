package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type BatchCreateServerTagsRequest struct {
	// 云服务器ID。

	ServerId string `json:"server_id"`

	Body *BatchCreateServerTagsRequestBody `json:"body,omitempty"`
}

func (o BatchCreateServerTagsRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "BatchCreateServerTagsRequest struct{}"
	}

	return strings.Join([]string{"BatchCreateServerTagsRequest", string(data)}, " ")
}
