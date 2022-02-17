package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// This is a auto create Body Object
type UpdateServerAutoTerminateTimeRequestBody struct {
	// 销毁时间

	AutoTerminateTime string `json:"auto_terminate_time"`
}

func (o UpdateServerAutoTerminateTimeRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "UpdateServerAutoTerminateTimeRequestBody struct{}"
	}

	return strings.Join([]string{"UpdateServerAutoTerminateTimeRequestBody", string(data)}, " ")
}
