package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type ServerNicSecurityGroup struct {
	// 安全组ID。

	Id string `json:"id"`
}

func (o ServerNicSecurityGroup) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ServerNicSecurityGroup struct{}"
	}

	return strings.Join([]string{"ServerNicSecurityGroup", string(data)}, " ")
}
