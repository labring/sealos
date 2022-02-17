package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// IPV6共享带宽。
type PostPaidServerIpv6Bandwidth struct {
	// 绑定的共享带宽ID。

	Id *string `json:"id,omitempty"`
}

func (o PostPaidServerIpv6Bandwidth) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "PostPaidServerIpv6Bandwidth struct{}"
	}

	return strings.Join([]string{"PostPaidServerIpv6Bandwidth", string(data)}, " ")
}
