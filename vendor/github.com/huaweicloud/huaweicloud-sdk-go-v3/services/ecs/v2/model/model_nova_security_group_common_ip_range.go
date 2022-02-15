package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type NovaSecurityGroupCommonIpRange struct {
	// 对端IP网段，cidr格式。

	Cidr *string `json:"cidr,omitempty"`
}

func (o NovaSecurityGroupCommonIpRange) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaSecurityGroupCommonIpRange struct{}"
	}

	return strings.Join([]string{"NovaSecurityGroupCommonIpRange", string(data)}, " ")
}
