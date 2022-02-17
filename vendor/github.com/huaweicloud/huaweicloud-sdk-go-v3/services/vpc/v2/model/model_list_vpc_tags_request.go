package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type ListVpcTagsRequest struct {
}

func (o ListVpcTagsRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ListVpcTagsRequest struct{}"
	}

	return strings.Join([]string{"ListVpcTagsRequest", string(data)}, " ")
}
