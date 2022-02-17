package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type ListVpcTagsResponse struct {
	// tag对象列表

	Tags           *[]ListTag `json:"tags,omitempty"`
	HttpStatusCode int        `json:"-"`
}

func (o ListVpcTagsResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ListVpcTagsResponse struct{}"
	}

	return strings.Join([]string{"ListVpcTagsResponse", string(data)}, " ")
}
