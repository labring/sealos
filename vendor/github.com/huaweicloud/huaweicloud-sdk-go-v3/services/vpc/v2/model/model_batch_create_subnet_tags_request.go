package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type BatchCreateSubnetTagsRequest struct {
	// 子网ID

	SubnetId string `json:"subnet_id"`

	Body *BatchCreateSubnetTagsRequestBody `json:"body,omitempty"`
}

func (o BatchCreateSubnetTagsRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "BatchCreateSubnetTagsRequest struct{}"
	}

	return strings.Join([]string{"BatchCreateSubnetTagsRequest", string(data)}, " ")
}
