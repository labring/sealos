package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type ListSubnetsByTagsRequest struct {
	Body *ListSubnetsByTagsRequestBody `json:"body,omitempty"`
}

func (o ListSubnetsByTagsRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ListSubnetsByTagsRequest struct{}"
	}

	return strings.Join([]string{"ListSubnetsByTagsRequest", string(data)}, " ")
}
