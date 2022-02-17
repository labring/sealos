package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// IPV6共享带宽。
type PrePaidServerIpv6Bandwidth struct {
	// 绑定的共享带宽ID。

	Id *string `json:"id,omitempty"`
}

func (o PrePaidServerIpv6Bandwidth) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "PrePaidServerIpv6Bandwidth struct{}"
	}

	return strings.Join([]string{"PrePaidServerIpv6Bandwidth", string(data)}, " ")
}
