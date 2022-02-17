package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// This is a auto create Body Object
type ResizeServerRequestBody struct {
	Resize *ResizePrePaidServerOption `json:"resize"`
}

func (o ResizeServerRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ResizeServerRequestBody struct{}"
	}

	return strings.Join([]string{"ResizeServerRequestBody", string(data)}, " ")
}
