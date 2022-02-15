package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// This is a auto create Body Object
type ReinstallServerWithoutCloudInitRequestBody struct {
	OsReinstall *ReinstallServerWithoutCloudInitOption `json:"os-reinstall"`
}

func (o ReinstallServerWithoutCloudInitRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ReinstallServerWithoutCloudInitRequestBody struct{}"
	}

	return strings.Join([]string{"ReinstallServerWithoutCloudInitRequestBody", string(data)}, " ")
}
