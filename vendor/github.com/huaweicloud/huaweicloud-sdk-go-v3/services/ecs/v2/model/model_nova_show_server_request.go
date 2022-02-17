package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type NovaShowServerRequest struct {
	// 云服务器ID。

	ServerId string `json:"server_id"`
	// 微版本头

	OpenStackAPIVersion *string `json:"OpenStack-API-Version,omitempty"`
}

func (o NovaShowServerRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaShowServerRequest struct{}"
	}

	return strings.Join([]string{"NovaShowServerRequest", string(data)}, " ")
}
