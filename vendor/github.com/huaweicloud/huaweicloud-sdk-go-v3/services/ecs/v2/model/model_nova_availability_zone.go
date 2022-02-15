package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// 可用域信息
type NovaAvailabilityZone struct {
	// 该字段的值为null。

	Hosts []string `json:"hosts"`
	// 可用域的名称。

	ZoneName string `json:"zoneName"`

	ZoneState *NovaAvailabilityZoneState `json:"zoneState"`
}

func (o NovaAvailabilityZone) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaAvailabilityZone struct{}"
	}

	return strings.Join([]string{"NovaAvailabilityZone", string(data)}, " ")
}
