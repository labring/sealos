package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type ShowSecurityGroupRequest struct {
	// 安全组ID

	SecurityGroupId string `json:"security_group_id"`
}

func (o ShowSecurityGroupRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowSecurityGroupRequest struct{}"
	}

	return strings.Join([]string{"ShowSecurityGroupRequest", string(data)}, " ")
}
