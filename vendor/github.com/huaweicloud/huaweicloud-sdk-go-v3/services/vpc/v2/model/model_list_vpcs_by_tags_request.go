package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type ListVpcsByTagsRequest struct {
	Body *ListVpcsByTagsRequestBody `json:"body,omitempty"`
}

func (o ListVpcsByTagsRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ListVpcsByTagsRequest struct{}"
	}

	return strings.Join([]string{"ListVpcsByTagsRequest", string(data)}, " ")
}
