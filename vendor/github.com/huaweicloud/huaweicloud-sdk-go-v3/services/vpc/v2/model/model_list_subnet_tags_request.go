package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type ListSubnetTagsRequest struct {
}

func (o ListSubnetTagsRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ListSubnetTagsRequest struct{}"
	}

	return strings.Join([]string{"ListSubnetTagsRequest", string(data)}, " ")
}
