package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// This is a auto create Body Object
type ResizePostPaidServerRequestBody struct {
	Resize *ResizePostPaidServerOption `json:"resize"`
}

func (o ResizePostPaidServerRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ResizePostPaidServerRequestBody struct{}"
	}

	return strings.Join([]string{"ResizePostPaidServerRequestBody", string(data)}, " ")
}
