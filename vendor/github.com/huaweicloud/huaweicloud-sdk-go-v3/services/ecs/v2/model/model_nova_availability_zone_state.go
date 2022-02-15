package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// 可用域的状态
type NovaAvailabilityZoneState struct {
	// 可用域状态。

	Available bool `json:"available"`
}

func (o NovaAvailabilityZoneState) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaAvailabilityZoneState struct{}"
	}

	return strings.Join([]string{"NovaAvailabilityZoneState", string(data)}, " ")
}
