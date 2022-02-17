package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type ListSubnetTagsResponse struct {
	// tag对象列表

	Tags           *[]ListTag `json:"tags,omitempty"`
	HttpStatusCode int        `json:"-"`
}

func (o ListSubnetTagsResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ListSubnetTagsResponse struct{}"
	}

	return strings.Join([]string{"ListSubnetTagsResponse", string(data)}, " ")
}
