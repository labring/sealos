package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// This is a auto create Body Object
type ReinstallServerWithCloudInitRequestBody struct {
	OsReinstall *ReinstallServerWithCloudInitOption `json:"os-reinstall"`
}

func (o ReinstallServerWithCloudInitRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ReinstallServerWithCloudInitRequestBody struct{}"
	}

	return strings.Join([]string{"ReinstallServerWithCloudInitRequestBody", string(data)}, " ")
}
