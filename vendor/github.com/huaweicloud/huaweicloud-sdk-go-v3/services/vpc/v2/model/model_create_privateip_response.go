package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type CreatePrivateipResponse struct {
	// 私有IP列表对象

	Privateips     *[]Privateip `json:"privateips,omitempty"`
	HttpStatusCode int          `json:"-"`
}

func (o CreatePrivateipResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "CreatePrivateipResponse struct{}"
	}

	return strings.Join([]string{"CreatePrivateipResponse", string(data)}, " ")
}
