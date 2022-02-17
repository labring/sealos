package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// This is a auto create Body Object
type BatchAddServerNicsRequestBody struct {
	// 需要添加的网卡参数列表。

	Nics []BatchAddServerNicOption `json:"nics"`
}

func (o BatchAddServerNicsRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "BatchAddServerNicsRequestBody struct{}"
	}

	return strings.Join([]string{"BatchAddServerNicsRequestBody", string(data)}, " ")
}
