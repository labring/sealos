package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type ListPrivateipsResponse struct {
	// 私有IP列表对象

	Privateips     *[]Privateip `json:"privateips,omitempty"`
	HttpStatusCode int          `json:"-"`
}

func (o ListPrivateipsResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ListPrivateipsResponse struct{}"
	}

	return strings.Join([]string{"ListPrivateipsResponse", string(data)}, " ")
}
