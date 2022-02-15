package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type ShowServerTagsResponse struct {
	// 标签列表

	Tags           *[]ServerTag `json:"tags,omitempty"`
	HttpStatusCode int          `json:"-"`
}

func (o ShowServerTagsResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowServerTagsResponse struct{}"
	}

	return strings.Join([]string{"ShowServerTagsResponse", string(data)}, " ")
}
