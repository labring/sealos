package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// This is a auto create Body Object
type ChangeServerOsWithCloudInitRequestBody struct {
	OsChange *ChangeServerOsWithCloudInitOption `json:"os-change"`
}

func (o ChangeServerOsWithCloudInitRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ChangeServerOsWithCloudInitRequestBody struct{}"
	}

	return strings.Join([]string{"ChangeServerOsWithCloudInitRequestBody", string(data)}, " ")
}
